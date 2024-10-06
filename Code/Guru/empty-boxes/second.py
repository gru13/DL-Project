from ultralytics import YOLO
# Load the pre-trained YOLOv8 model
model = YOLO('yolov8n.pt')  # You can use 'yolov8s.pt', 'yolov8m.pt', etc. for larger models

# Train the model on a custom dataset
results = model.train(
    data='./dataset/data.yaml',  # Path to your dataset YAML file
    epochs=500,                      # Adjust number of epochs as needed
    batch=16,                       # Batch size
    imgsz=1200 ,                     # Image size
    device=0                        # Set to 0 to ensure it runs on your GPU
)
# Save the best model after training
model.save('best_yolov8_model.pt')
