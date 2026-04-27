"""Contract tests for the classifier: the invariants the frontend and DB rely on."""

from __future__ import annotations

import pytest

from src.classifier import predict_from_text

SAMPLE_TEXTS = [
    "City of San Francisco permit application form 3-8 building department",
    "lorem ipsum dolor sit amet consectetur adipiscing elit",
    "this is a random paragraph about cats and dogs and weather",
]


@pytest.mark.parametrize("text", SAMPLE_TEXTS)
def test_predict_from_text_invariants(trained_pipeline, text):
    """Every prediction must satisfy the contract the rest of the system assumes.

    1. The label is one of the trained classes (frontend filter dropdown depends on this).
    2. Probabilities cover exactly the trained classes (no missing / extra keys).
    3. Probabilities sum to 1.0 within float tolerance.
    4. Every probability is in [0, 1].
    """
    result = predict_from_text(trained_pipeline, text)

    expected_classes = set(trained_pipeline.classes_)
    probabilities = result["probabilities"]

    assert result["label"] in expected_classes, (
        f"Label {result['label']!r} not in trained classes {expected_classes}"
    )
    assert set(probabilities.keys()) == expected_classes, (
        f"Probability keys {set(probabilities.keys())} != classes {expected_classes}"
    )
    assert sum(probabilities.values()) == pytest.approx(1.0, abs=1e-6)
    assert all(0.0 <= p <= 1.0 for p in probabilities.values())
