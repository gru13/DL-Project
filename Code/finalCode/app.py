from flask import Flask, request, jsonify, send_file, render_template, redirect, url_for, send_from_directory
import os
import cv2
import json
import uuid
from paddleocr import PaddleOCR
from ultralytics import YOLO
import shutil
from PIL import ImageDraw, Image, ImageEnhance, ImageFilter


labels = ['Detailed', 'EmptyInput', 'TableColumn', 'boxInput', 'checkBox', 'lineInput', 'signature']
app = Flask(__name__)
Pocr = PaddleOCR(lang='en', rec_image_shape="3,32,100", rec_batch_num=1, max_text_length=25, rec_algorithm='CRNN', use_gpu=True, rec_model_dir='./Models/ppocr_mobile_v4.0_rec_infer/')
YoloModel = YOLO("./Models/best-071024-4.pt")

history = 'history'
cropped = "cropped"
app.config['history'] = history
app.config['cropped'] = cropped

# Ensure the upload folder exists
os.makedirs(history, exist_ok=True)
os.makedirs(cropped, exist_ok=True)

output_dir = os.path.join(app.static_folder, 'output')


# Directory for storing templates (images and json files)
TEMPLATES_DIR = os.path.join('static', 'Templates')

# Ensure the templates directory exists
if not os.path.exists(TEMPLATES_DIR):
    os.makedirs(TEMPLATES_DIR)


# Route to list existing templates
@app.route('/')
def home():
    templatesDIR = [f for f in os.listdir(TEMPLATES_DIR)]
    print(templatesDIR)
    return render_template('index.html', templates=templatesDIR, loc=TEMPLATES_DIR)

# Route to handle image upload and redirect to label editor
@app.route('/upload', methods=['POST'])
def upload_image():
    if 'image' not in request.files:
        return 'No file part', 400
    file = request.files['image']
    if file.filename == '':
        return 'No selected file', 400

    # Save the image to the output directory
    image_name = os.path.splitext(file.filename)[0]
    image_path = os.path.join(output_dir, f'{image_name}.jpg')
    file.save(image_path)

    # Generate JSON file if it doesn't exist
    json_path = os.path.join(output_dir, f'{image_name}_paddle.json')
    if not os.path.exists(json_path):
        with open(json_path, 'w') as json_file:
            json.dump({"labels": []}, json_file)  # Example JSON structure

    # Redirect to the label editor route with image_name
    return redirect(url_for('label_editor', image_name=image_name))


# Route to display an existing template (image + JSON)
@app.route('/template/<template_id>')
def view_template(template_id):
    json_url = url_for('static', filename=f"Templates/{template_id}/layout.json")
    image_url = url_for('static', filename=f"Templates/{template_id}/image.jpg")
    return render_template('template.html', template_id=template_id,image_url=image_url,json_url=json_url)


@app.route('/paddleOCRrun/<image_name>', methods=['POST'])
def paddleOCRrun(image_name):
    img_path = os.path.join(output_dir, f"{image_name}.jpg")
    img = cv2.imread(img_path)
    json_data = []
    print(image_name)
    # Perform OCR
    result = Pocr.ocr(img_path)

    # Convert quadrilateral to rectangle
    def convert_quad_to_rect(quad_bbox):
        x_coords = [point[0] for point in quad_bbox]
        y_coords = [point[1] for point in quad_bbox]
        return [min(x_coords), min(y_coords), max(x_coords), max(y_coords)]
    
    for line in result:
        for word_info in line:
            quad_bbox = word_info[0]
            text = word_info[1][0]
            confidence = word_info[1][1]
            entry_uuid = str(uuid.uuid4())

            # Convert quadrilateral bbox to integer coordinates
            quad_bbox = [[int(coord[0]), int(coord[1])] for coord in quad_bbox]
            rect_bbox = convert_quad_to_rect(quad_bbox)

            # Draw rectangle on the image
            cv2.rectangle(img, (int(rect_bbox[0]), int(rect_bbox[1])), (int(rect_bbox[2]), int(rect_bbox[3])), (0, 255, 0), 2)
            
            json_data.append({
                "uuid": entry_uuid,
                "class": "Label",
                "confidence": confidence,
                "bbox": rect_bbox,
                "text": text,
                "child": [],
            })
            
    # Save output JSON
    json_output_path = os.path.join(output_dir, f"{image_name}_paddle.json")
    with open(json_output_path, 'w') as json_file:
        json.dump(json_data, json_file, indent=4)


    # Save output image
    output_image_path = os.path.join(output_dir, f'{image_name}_paddle.jpg')
    cv2.imwrite(output_image_path, img)

    # Prepare the redirect URL to the label editor
    redirect_url = url_for('label_editor', image_name=f'{image_name}')

    # Return a JSON response with the redirect URL
    return jsonify({"redirect_url": redirect_url})



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

    output_image_path = os.path.join(output_dir, f"{image_name}_yolo.jpg")
    cv2.imwrite(output_image_path, img)

    return jsonify({'success': True, 'message': 'YOLO prediction completed'}), 200

@app.route('/label_editor/<image_name>')
def label_editor(image_name):
    image_url = url_for('static', filename=f'output/{image_name}.jpg')
    json_url = url_for('static', filename=f'output/{image_name}_paddle.json')
    return render_template('label_editor.html', image_name=image_name, image_url=image_url, json_url=json_url)

@app.route('/label_update', methods=['POST'])
def label_update():
    data = request.get_json()
    image_name = data.get('image_name')
    labels = data.get('labels')
    
    json_path = os.path.join(output_dir, f"{image_name}_paddle.json")
    with open(json_path, 'w') as json_file:
        json.dump(labels, json_file, indent=4)
    
    return jsonify({'success': True}), 200

@app.route('/input_editor/<image_name>', methods=['GET'])
def input_editor(image_name):
    image_url = url_for('static', filename=f'output/{image_name}.jpg')
    json_url = url_for('static', filename=f'output/{image_name}_yolo.json')
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



@app.route('/connection/<image_name>')
def connection(image_name):
    image_url = url_for('static', filename=f'output/{image_name}.jpg')
    layout_json_path = os.path.join(TEMPLATES_DIR, f'{image_name}/layout.json')
    layout_json_url = url_for('static', filename=f'Templates/{image_name}/layout.json')

    # Check if layout.json already exists
    if os.path.exists(layout_json_path):
        print(f"Using existing layout JSON: {layout_json_url}")
        return render_template('connection.html',
                               image_name=image_name,
                               image_url=image_url,
                               layout_json_url=layout_json_url)
    else:
        print("Creating new ")
    # If layout.json doesn't exist, create it
    yolo_json_path = os.path.join(output_dir, f'{image_name}_yolo.json')
    paddle_json_path = os.path.join(output_dir, f'{image_name}_paddle.json')

    try:
        with open(yolo_json_path, 'r') as yolo_file:
            yolo_data = json.load(yolo_file)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        return f"Error loading YOLO data: {e}", 500

    try:
        with open(paddle_json_path, 'r') as paddle_file:
            paddle_data = json.load(paddle_file)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        return f"Error loading PaddleOCR data: {e}", 500

    # Add Model field to YOLO and Paddle data
    for item in yolo_data:
        item['Model'] = 'YOLO'
        item['child'] = []

    for item in paddle_data:
        item['Model'] = 'PADDLE'
        item['parent'] = ''

    # Merge YOLO and Paddle data
    combined_layout = yolo_data + paddle_data
    os.makedirs(TEMPLATES_DIR + '/' + image_name, exist_ok=True)

    # Fix the source path from image_url to the actual file path
    source_image_path = os.path.join(app.static_folder, f'output/{image_name}.jpg')
    destination_path = os.path.join(TEMPLATES_DIR, image_name, "image.jpg")
    shutil.copy(source_image_path, destination_path)

    # Save the layout JSON file
    try:
        with open(layout_json_path, 'w') as layout_file:
            json.dump(combined_layout, layout_file, indent=4)
    except IOError as e:
        return f"Error writing layout JSON: {e}", 500

    print(f"Created new layout JSON: {layout_json_url}")

    return render_template('connection.html',
                           image_name=image_name,
                           image_url=image_url,
                           layout_json_url=layout_json_url)

@app.route('/save_changes', methods=['POST'])
def save_changes():
    layout = request.json
    image_name = layout.get('image_name')
    print(layout)
    # Save the updated layout JSON
    layout_json_path = os.path.join(TEMPLATES_DIR, f"{image_name}/layout.json")
    with open(layout_json_path, 'w') as layout_file:
        json.dump(layout["layout"], layout_file, indent=4)
    
    return jsonify({"message": "Changes saved successfully"}), 200

@app.route('/get_labels')
def get_labels():
    labels = ['Detailed', 'EmptyInput', 'TableColumn', 'boxInput', 'checkBox', 'lineInput', 'signature']
    return jsonify(labels)



from google.cloud import vision
import io

def detect_text(image_path):
    client = vision.ImageAnnotatorClient()

    with io.open(image_path, 'rb') as image_file:
        content = image_file.read()

    image = vision.Image(content=content)
    response = client.text_detection(image=image)
    texts = response.text_annotations

    if texts:
        return texts[0].description
    return ""

@app.route('/process-empty-text-elements', methods=['POST'])
def process_empty_text_elements():
    try:
        # Get the layout data from the form (as JSON string)
        layout_data = request.form.get('layout')
        if layout_data:
            layout_data = json.loads(layout_data)

        # Get the image file from the form
        image = request.files.get('image')
        
        if image:
            # Save the image to the upload folder
            image_path = os.path.join(app.config['history'], image.filename)
            image.save(image_path)
            
            # Process each bounding box and recognize text using Google Vision AI
            updated_layout = []
            for detection in layout_data:
                bbox = detection['bbox']
                # Create a new image with just this bounding box
                with Image.open(image_path) as img:
                    cropped_image = img.crop((bbox[0], bbox[1], bbox[2], bbox[3]))
                    cropped_path = os.path.join(app.config['cropped'], f"{detection['uuid']}.png")
                    cropped_image.save(cropped_path)
                
                recognized_text = detect_text(cropped_path)
                if recognized_text:
                    updated_layout.append({
                        "uuid": detection["uuid"],
                        "text": recognized_text
                    })
                    print(recognized_text, detection["uuid"])

        # Return a response back to the frontend
        return jsonify({
            "message": "Data and image processed successfully",
            "status": "success",
            "updated_layout": updated_layout
        }), 200

    except Exception as e:
        print(e)
        return jsonify({"message": str(e), "status": "error"}), 400

if __name__ == '__main__':
    app.run(debug=True)
