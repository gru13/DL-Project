# from flask import Flask, request, jsonify, send_file, render_template, redirect, url_for
# import os
# import cv2
# import json
# import uuid
# from paddleocr import PaddleOCR
# from ultralytics import YOLO

# labels = ['Detailed', 'EmptyInput', 'TableColumn', 'boxInput', 'checkBox', 'lineInput', 'signature']
# app = Flask(__name__, static_folder="output")
# ocr = PaddleOCR(lang='en', rec_image_shape="3,32,100", rec_batch_num=1, max_text_length=25, rec_algorithm='CRNN', use_gpu=True, rec_model_dir='../models/ppocr_mobile_v4.0_rec_infer/')  # Load the PaddleOCR model
# YoloModel = YOLO("../models/best-071024-4.pt")

# # Directory to save output images and JSON
# output_dir = 'output/'
# os.makedirs(output_dir, exist_ok=True)

# @app.route('/')
# def index():
#     return render_template('index.html')

# @app.route('/upload', methods=['POST'])
# def upload():
#     # Get the image file
#     image_file = request.files['image']
#     image_name = image_file.filename
#     img_path = os.path.join(output_dir, image_name)

#     # Save the uploaded image
#     image_file.save(img_path)

#     # Process the image with OCR
#     result = ocr.ocr(img_path)

#     # Function to convert quadrilateral bbox to rectangular bbox
#     def convert_quad_to_rect(quad_bbox):
#         x_coords = [point[0] for point in quad_bbox]
#         y_coords = [point[1] for point in quad_bbox]
#         x_min = min(x_coords)
#         y_min = min(y_coords)
#         x_max = max(x_coords)
#         y_max = max(y_coords)
#         return [x_min, y_min, x_max, y_max]

#     # Create a list to hold the results
#     output = []

#     # Draw bounding boxes on the image and build the JSON
#     img = cv2.imread(img_path)
#     for line in result:
#         for word_info in line:
#             quad_bbox = word_info[0]  # Quadrilateral bounding box coordinates
#             text = word_info[1][0]  # Recognized text
#             confidence = word_info[1][1]  # Confidence level

#             # Convert bbox coordinates to integers
#             quad_bbox = [[int(coord[0]), int(coord[1])] for coord in quad_bbox]
            
#             # Convert quadrilateral bbox to rectangular format [x_min, y_min, x_max, y_max]
#             rect_bbox = convert_quad_to_rect(quad_bbox)

#             # Draw the rectangular bounding box on the image
#             cv2.rectangle(img, (rect_bbox[0], rect_bbox[1]), (rect_bbox[2], rect_bbox[3]), (0, 255, 0), 2)

#             # Generate a unique identifier for each detected word
#             entry_uuid = str(uuid.uuid4())

#             # Create a dictionary entry for this detected text
#             output.append({
#                 "uuid": entry_uuid,
#                 "class": "Label",
#                 "confidence": confidence,
#                 "bbox": rect_bbox,  # Store rectangular bbox
#                 "text": text,
#                 "child": [], 
#             })

#     # Save the annotated image
#     output_image_path = os.path.join(output_dir, f'{os.path.splitext(image_name)[0]}_Paddle.jpg')
#     cv2.imwrite(output_image_path, img)

#     # Save the JSON output to a file
#     output_json_path = os.path.join(output_dir, f'{os.path.splitext(image_name)[0]}_Paddle.json')
#     with open(output_json_path, 'w') as json_file:
#         json.dump(output, json_file, indent=4)

#     return redirect(url_for('label_editor', image_name=os.path.splitext(image_name)[0]))

# @app.route('/label_editor/<image_name>')
# def label_editor(image_name):
#     image_url = url_for('static', filename=f'{image_name}.jpg')
#     json_url = url_for('static', filename=f'{image_name}_Paddle.json')
    
#     # Pass the image URL and JSON URL to the template
#     return render_template('label_editor.html', image_name=image_name, image_url=image_url, json_url=json_url)

# @app.route('/label_update', methods=['POST'])
# def label_update():
#     data = request.get_json()  # Get the JSON data sent from the frontend
#     image_name = data.get('image_name')  # Retrieve the json_url
#     labels = data.get('labels')  # Retrieve the updated labels
    
#     json_path = os.path.join(output_dir, f"{image_name}_Paddle.json")
#     with open(json_path, 'w') as json_file:
#         json.dump(labels, json_file, indent=4)

#     return jsonify({'success': True}), 200  # Return a success response



# @app.route('/input_editor/<image_name>', methods=['GET', 'POST'])
# def input_editor(image_name):
#     # Perform YOLO prediction
#     img_path = os.path.join(output_dir, f"{image_name}.jpg")
#     results = YoloModel.predict(source=img_path, save=True, conf=0.25, device=0)
#     img = cv2.imread(img_path)
#     annotated_img_path = os.path.join(output_dir, f"{image_name}_yolo.jpg")
#     # Prepare a list to store JSON data
#     json_data = []

#     for result in results:
#         for box in result.boxes:
#             # Extract bbox coordinates
#             bbox = box.xyxy[0].cpu().numpy().astype(int).tolist()  # Convert to list
#             # Extract other details
#             class_id = int(box.cls.cpu().numpy())
#             confidence = float(box.conf.cpu().numpy())
#             entry_uuid = str(uuid.uuid4())

#             cv2.rectangle(img, (bbox[0], bbox[1]), (bbox[2], bbox[3]), (0, 255, 0), 2)
#             # Append data to JSON
#             json_data.append({
#                 "uuid": entry_uuid,
#                 "class": labels[class_id],
#                 "confidence": confidence,
#                 "bbox": bbox,
#                 "text": "",
#                 "parent": ""
#             })

#     # Save the JSON data
#     json_output_path = os.path.join(output_dir, f"{image_name}_yolo.json")
#     with open(json_output_path, 'w') as json_file:
#         json.dump(json_data, json_file, indent=4)
#     # Optionally, save the output image with bounding boxes
#     output_image_path = f'{output_dir}{image_name}_yolo.jpg'
#     cv2.imwrite(output_image_path, img)
#     image_url = url_for('static', filename=f'{image_name}.jpg')
#     json_url = url_for('static', filename=f'{image_name}_yolo.json')
#     # Return the image and JSON file paths to the template
#     return render_template('input_editor.html', image_name=image_name,image_url=image_url, json_url=json_url)



# if __name__ == '__main__':
#     app.run(debug=True)

from flask import Flask, request, jsonify, send_file, render_template, redirect, url_for
import os
import cv2
import json
import uuid
from paddleocr import PaddleOCR
from ultralytics import YOLO

labels = ['Detailed', 'EmptyInput', 'TableColumn', 'boxInput', 'checkBox', 'lineInput', 'signature']
app = Flask(__name__, static_folder="output")
ocr = PaddleOCR(lang='en', rec_image_shape="3,32,100", rec_batch_num=1, max_text_length=25, rec_algorithm='CRNN', use_gpu=True, rec_model_dir='../models/ppocr_mobile_v4.0_rec_infer/')
YoloModel = YOLO("../models/best-071024-4.pt")

output_dir = 'output/'
os.makedirs(output_dir, exist_ok=True)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/paddleOCRrun', methods=['POST'])
def paddleOCRrun():
    image_file = request.files['image']
    image_name = image_file.filename
    img_path = os.path.join(output_dir, image_name)
    image_file.save(img_path)
    
    result = ocr.ocr(img_path)
    
    def convert_quad_to_rect(quad_bbox):
        x_coords = [point[0] for point in quad_bbox]
        y_coords = [point[1] for point in quad_bbox]
        return [min(x_coords), min(y_coords), max(x_coords), max(y_coords)]
    
    output = []
    img = cv2.imread(img_path)
    for line in result:
        for word_info in line:
            quad_bbox = word_info[0]
            text = word_info[1][0]
            confidence = word_info[1][1]
            
            quad_bbox = [[int(coord[0]), int(coord[1])] for coord in quad_bbox]
            rect_bbox = convert_quad_to_rect(quad_bbox)
            
            cv2.rectangle(img, (int(rect_bbox[0]), int(rect_bbox[1])), (int(rect_bbox[2]), int(rect_bbox[3])), (0, 255, 0), 2)
            
            entry_uuid = str(uuid.uuid4())
            output.append({
                "uuid": entry_uuid,
                "class": "Label",
                "confidence": confidence,
                "bbox": rect_bbox,
                "text": text,
                "child": [],
            })
    
    output_image_path = os.path.join(output_dir, f'{os.path.splitext(image_name)[0]}_Paddle.jpg')
    cv2.imwrite(output_image_path, img)
    
    output_json_path = os.path.join(output_dir, f'{os.path.splitext(image_name)[0]}_Paddle.json')
    with open(output_json_path, 'w') as json_file:
        json.dump(output, json_file, indent=4)
    
    return redirect(url_for('label_editor', image_name=os.path.splitext(image_name)[0]))

@app.route('/label_editor/<image_name>')
def label_editor(image_name):
    image_url = url_for('static', filename=f'{image_name}.jpg')
    json_url = url_for('static', filename=f'{image_name}_Paddle.json')
    return render_template('label_editor.html', image_name=image_name, image_url=image_url, json_url=json_url)

@app.route('/label_update', methods=['POST'])
def label_update():
    data = request.get_json()
    image_name = data.get('image_name')
    labels = data.get('labels')
    
    json_path = os.path.join(output_dir, f"{image_name}_Paddle.json")
    with open(json_path, 'w') as json_file:
        json.dump(labels, json_file, indent=4)
    
    return jsonify({'success': True}), 200

@app.route('/run_yolo/<image_name>', methods=['POST'])
def run_yolo(image_name):
    img_path = os.path.join(output_dir, f"{image_name}.jpg")
    results = YoloModel.predict(source=img_path, save=True, conf=0.25, device=0)
    img = cv2.imread(img_path)
    json_data = []

    for result in results:
        for box in result.boxes:
            bbox = box.xyxy[0].cpu().numpy().astype(int).tolist()
            class_id = int(box.cls.cpu().numpy())
            confidence = float(box.conf.cpu().numpy())
            entry_uuid = str(uuid.uuid4())

            cv2.rectangle(img, (bbox[0], bbox[1]), (bbox[2], bbox[3]), (0, 255, 0), 2)
            json_data.append({
                "uuid": entry_uuid,
                "class": labels[class_id],
                "confidence": confidence,
                "bbox": bbox,
                "text": "",
                "parent": ""
            })

    json_output_path = os.path.join(output_dir, f"{image_name}_yolo.json")
    with open(json_output_path, 'w') as json_file:
        json.dump(json_data, json_file, indent=4)

    output_image_path = f'{output_dir}{image_name}_yolo.jpg'
    cv2.imwrite(output_image_path, img)

    return jsonify({'success': True, 'message': 'YOLO prediction completed'}), 200

@app.route('/input_editor/<image_name>', methods=['GET'])
def input_editor(image_name):
    image_url = url_for('static', filename=f'{image_name}.jpg')
    json_url = url_for('static', filename=f'{image_name}_yolo.json')
    return render_template('input_editor.html', image_name=image_name, image_url=image_url, json_url=json_url)

@app.route('/input_update', methods=['POST'])
def input_update():
    data = request.get_json()
    image_name = data.get('image_name')
    labels = data.get('labels')
    
    json_path = os.path.join(output_dir, f"{image_name}_yolo.json")
    with open(json_path, 'w') as json_file:
        json.dump(labels, json_file, indent=4)
    
    return jsonify({'success': True}), 200

if __name__ == '__main__':
    app.run(debug=True)