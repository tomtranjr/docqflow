import os

import mlflow
from dotenv import load_dotenv

load_dotenv()


def main():
    """Test the MLflow connection using MLFLOW_TRACKING_URI from the environment."""
    tracking_uri = os.getenv("MLFLOW_TRACKING_URI")
    if not tracking_uri:
        print("Error: MLFLOW_TRACKING_URI not set in .env")
        return

    mlflow.set_tracking_uri(tracking_uri)
    mlflow.set_experiment("test-experiment")

    experiment = mlflow.get_experiment_by_name("test-experiment")
    print(f"Connected to MLflow at: {tracking_uri}")
    print(f"Experiment: {experiment.name} (ID: {experiment.experiment_id})")


if __name__ == "__main__":
    main()