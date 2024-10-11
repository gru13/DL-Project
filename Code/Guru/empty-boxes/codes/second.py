from ultralytics import YOLO
import torch
torch.cuda.empty_cache()
# Load the pre-trained YOLOv8 model
model = YOLO('../trainedYOLO/best-071024-4.pt')  

# Train the model on a custom dataset
results = model.train(
    data='../dataset/data.yaml',  # Path to your dataset YAML file
    epochs=500,                      # Adjust number of epochs as needed
    batch=8,                       # Batch size
    imgsz=1024,                     # Image size
    device=0,                        # Set to 0 to ensure it runs on your GPU
    patience=20
)
# Save the best model after training
model.save('../trainedYOLO/best-071024-5.pt')
