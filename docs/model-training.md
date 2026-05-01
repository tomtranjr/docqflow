# Training and Predicting with the Classifier

This guide explains how to train the document classifier and run predictions from the command line.

## Training

The classifier learns to tell document types apart based on the text inside PDFs. You organize your PDFs into folders, and each folder name becomes a label.

### Folder structure

```
data/
├── permit-3-8/        # PDFs of the target document type
│   ├── form1.pdf
│   └── form2.pdf
└── not-permit-3-8/    # PDFs that are not the target type
    ├── doc1.pdf
    └── doc2.pdf
```

You need at least 2 PDFs per folder (4 total minimum) for the train/test split to work.

### Run training

```bash
uv run python -m src.classifier train --data-dir data
```

This will:

1. Read every PDF in each subfolder of `data/`
2. Extract the text from each PDF
3. Split the data into training and test sets
4. Train a TF-IDF + Logistic Regression pipeline
5. Print a classification report with precision, recall, and f1 scores
6. Log parameters and metrics to MLflow (if `MLFLOW_TRACKING_URI` is set in `.env`)
7. Save the trained model to `models/model.joblib`

You can also specify a custom model output path:

```bash
uv run python -m src.classifier train --data-dir data --model-path models/my_model.joblib
```

## Predicting

Once you have a trained model, you can classify any PDF from the command line.

```bash
uv run python -m src.classifier predict --pdf-path path/to/document.pdf
```

This will print the predicted label and the probability for each class:

```
Prediction: permit-3-8
Probabilities:
  not-permit-3-8: 0.401
  permit-3-8: 0.599
```

You can point to a different model file if needed:

```bash
uv run python -m src.classifier predict --model-path models/my_model.joblib --pdf-path document.pdf
```

## How it works

The model uses two steps:

1. **TF-IDF vectorization** turns the text from each PDF into a numerical feature vector. It keeps the 5,000 most important words and bigrams (two-word phrases), ignoring common English stop words.

2. **Logistic Regression** takes those features and learns which patterns belong to which document class. It uses balanced class weights so it does not get biased toward whichever class has more examples.

Both steps are bundled into a single scikit-learn Pipeline, so the same object handles both vectorization and classification.

## MLflow logging

If `MLFLOW_TRACKING_URI` is set in your `.env` file, training will log the following to MLflow:

- Parameters: `max_features`, `ngram_range`, `max_iter`, `train_size`, `test_size`
- Metrics: `accuracy`, `macro_precision`, `macro_recall`, `macro_f1`
- The trained model artifact

If the MLflow server is not reachable, training will still complete and save the model locally. You will see a warning in the terminal.
