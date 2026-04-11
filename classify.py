"""
Simple document classifier using TF-IDF + Logistic Regression.

Training data layout:
    data/
        doc_a/
            file1.pdf
            file2.pdf
        not_doc_a/
            file3.pdf
            file4.pdf

Usage:
    # Train and save model
    python classify.py train --data-dir data --model-path model.joblib

    # Predict on a single PDF
    python classify.py predict --model-path model.joblib --pdf-path document.pdf
"""

import argparse
import os
from pathlib import Path

import fitz
import joblib
import mlflow
from dotenv import load_dotenv
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

load_dotenv()


def extract_text(pdf_path: str) -> str:
    """Extract text content from a PDF file path."""
    doc = fitz.open(pdf_path)
    text = " ".join(page.get_text() for page in doc)
    doc.close()
    return text


def extract_text_from_bytes(pdf_bytes: bytes) -> str:
    """Extract text content from PDF bytes (for file uploads)."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    text = " ".join(page.get_text() for page in doc)
    doc.close()
    return text


def load_model(model_path: str = "models/model.joblib") -> Pipeline | None:
    """Load a trained model pipeline from disk. Returns None if not found."""
    try:
        return joblib.load(model_path)
    except FileNotFoundError:
        print(f"Model not found at {model_path}. Train a model first.")
        return None


def predict_from_text(pipeline: Pipeline, text: str) -> dict:
    """Run prediction on already-extracted text. Used by FastAPI."""
    label = pipeline.predict([text])[0]
    probas = pipeline.predict_proba([text])[0]
    classes = pipeline.classes_
    return {
        "label": label,
        "probabilities": {cls: float(prob) for cls, prob in zip(classes, probas)},
    }


def load_labeled_data(data_dir: str) -> tuple[list[str], list[str]]:
    """Load PDFs from labeled subdirectories.

    Each subdirectory name becomes a label. All PDFs inside
    that directory are assigned that label.

    Returns:
        texts: list of extracted text strings
        labels: list of corresponding label strings
    """
    texts = []
    labels = []
    data_path = Path(data_dir)

    for label_dir in sorted(data_path.iterdir()):
        if not label_dir.is_dir():
            continue
        label = label_dir.name
        for pdf_file in label_dir.glob("*.pdf"):
            text = extract_text(str(pdf_file))
            if text.strip():
                texts.append(text)
                labels.append(label)
                print(f"  loaded: {pdf_file.name} -> {label}")
            else:
                print(f"  skipped (no text): {pdf_file.name}")

    return texts, labels


def build_pipeline() -> Pipeline:
    """Build a TF-IDF + Logistic Regression pipeline."""
    return Pipeline(
        [
            (
                "tfidf",
                TfidfVectorizer(
                    max_features=5000,
                    stop_words="english",
                    ngram_range=(1, 2),
                ),
            ),
            (
                "clf",
                LogisticRegression(
                    class_weight="balanced",
                    max_iter=1000,
                ),
            ),
        ]
    )


def train(data_dir: str, model_path: str) -> dict:
    """Train the classifier on labeled PDF data, log to MLflow, and save the model.

    Returns:
        dict with accuracy, per-class precision/recall/f1, and macro averages.
    """
    print(f"Loading data from: {data_dir}")
    texts, labels = load_labeled_data(data_dir)

    if len(texts) < 4:
        print(
            f"Only found {len(texts)} documents. Need at least 4 for train/test split."
        )
        return {}

    unique_labels = set(labels)
    print(
        f"\nFound {len(texts)} documents across {len(unique_labels)} classes: {unique_labels}"
    )

    X_train, X_test, y_train, y_test = train_test_split(
        texts, labels, test_size=0.2, stratify=labels, random_state=42
    )

    pipeline = build_pipeline()
    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    report = classification_report(y_test, y_pred, output_dict=True)
    print("\n--- Classification Report ---")
    print(classification_report(y_test, y_pred))

    # -- MLflow logging --
    try:
        tracking_uri = os.getenv("MLFLOW_TRACKING_URI")
        if tracking_uri:
            mlflow.set_tracking_uri(tracking_uri)

        mlflow.set_experiment("doc-classifier")

        with mlflow.start_run():
            mlflow.log_param("max_features", 5000)
            mlflow.log_param("ngram_range", "1,2")
            mlflow.log_param("max_iter", 1000)
            mlflow.log_param("train_size", len(X_train))
            mlflow.log_param("test_size", len(X_test))

            mlflow.log_metric("accuracy", report["accuracy"])
            mlflow.log_metric("macro_precision", report["macro avg"]["precision"])
            mlflow.log_metric("macro_recall", report["macro avg"]["recall"])
            mlflow.log_metric("macro_f1", report["macro avg"]["f1-score"])

            mlflow.sklearn.log_model(pipeline, "model")
        print("MLflow logging complete.")
    except Exception as e:
        print(f"MLflow logging failed: {e}")
        print("Training completed but metrics were not logged.")

    joblib.dump(pipeline, model_path)
    print(f"Model saved to: {model_path}")

    return report


def predict(model_path: str, pdf_path: str) -> dict:
    """Load a trained model and classify a single PDF.

    Returns:
        dict with label and probabilities, or empty dict on failure.
    """
    pipeline = load_model(model_path)
    text = extract_text(pdf_path)

    if not text.strip():
        print("Could not extract text from PDF.")
        return {}

    return predict_from_text(pipeline, text)


def main():
    parser = argparse.ArgumentParser(description="PDF document classifier")
    subparsers = parser.add_subparsers(dest="command", required=True)

    train_parser = subparsers.add_parser("train", help="Train the classifier")
    train_parser.add_argument(
        "--data-dir",
        required=True,
        help="Directory with labeled subdirectories of PDFs",
    )
    train_parser.add_argument(
        "--model-path",
        default="models/model.joblib",
        help="Where to save the trained model",
    )

    predict_parser = subparsers.add_parser("predict", help="Classify a PDF")
    predict_parser.add_argument(
        "--model-path", default="models/model.joblib", help="Path to trained model"
    )
    predict_parser.add_argument(
        "--pdf-path", required=True, help="PDF file to classify"
    )

    args = parser.parse_args()

    if args.command == "train":
        train(args.data_dir, args.model_path)
    elif args.command == "predict":
        result = predict(args.model_path, args.pdf_path)
        if result:
            print(f"Prediction: {result['label']}")
            print("Probabilities:")
            for cls, prob in result["probabilities"].items():
                print(f"  {cls}: {prob:.3f}")


if __name__ == "__main__":
    main()
