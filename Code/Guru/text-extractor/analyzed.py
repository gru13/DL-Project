import cv2
import numpy as np
from paddleocr import PaddleOCR, draw_ocr
import spacy
import os
import json

# Set the image path (update this to the correct path on your system)
imagePath = r"./NEFT Challan for Guru Prjt.jpg"

# Initialize PaddleOCR with pre-downloaded model paths
ocr = PaddleOCR(use_angle_cls=True, lang='en', use_gpu=False,table=True)

# Initialize spaCy for named entity recognition
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    print("Spacy model not found. Please install it using: python -m spacy download en_core_web_sm")
    exit(1)

def analyze_layout(image_path):
    """Run layout analysis using PaddleOCR."""
    try:
        result = ocr.ocr(image_path, rec=True, cls=True)
        return result
    except Exception as e:
        print(f"Error during OCR processing: {e}")
        return []

def recognize_entities(text):
    """Recognize named entities in the extracted text using spaCy."""
    if not isinstance(text, str):
        text = str(text)
    doc = nlp(text)
    entities = [(ent.text, ent.label_) for ent in doc.ents]
    return entities

def visualize_results(image_path, layout_result, output_path, font_path):
    """Visualize OCR results and save the output image."""
    image = cv2.imread(image_path)
    if image is None:
        print(f"Error: Unable to read image at {image_path}")
        return
    
    boxes = [line[0] for line in layout_result[0]]
    txts = [line[1][0] for line in layout_result[0]]
    scores = [line[1][1] for line in layout_result[0]]
    
    try:
        im_show = draw_ocr(image, boxes, txts, scores, font_path=font_path)
        cv2.imwrite(output_path, im_show)
    except Exception as e:
        print(f"Error visualizing results: {e}")

def process_form(image_path, font_path):
    """Process the form to extract text, entities, and visualize results."""
    if not os.path.exists(image_path):
        print(f"Error: Image file not found at {image_path}")
        return None, None

    # Analyze layout
    layout_result = analyze_layout(image_path)

    print("OCR Result Structure:")
    print(json.dumps(layout_result, indent=2, default=str))

    # Extract text and recognize entities
    extracted_info = []
    for page in layout_result:
        for line in page:
            if isinstance(line, list) and len(line) >= 2:
                box = line[0]
                text = line[1][0] if isinstance(line[1], list) else str(line[1])
                confidence = line[1][1] if isinstance(line[1], list) and len(line[1]) > 1 else None
                entities = recognize_entities(text)
                extracted_info.append({
                    'text': text,
                    'box': box,
                    'confidence': confidence,
                    'entities': entities
                })

    # Visualize results
    output_path = os.path.splitext(image_path)[0] + "_analyzed.jpg"
    visualize_results(image_path, layout_result, output_path, font_path)

    return extracted_info, output_path

def save_json(data, file_path):
    """Save extracted data to a JSON file."""
    try:
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=4, default=str)
    except Exception as e:
        print(f"Error saving JSON file: {e}")

def main(image_path):
    """Main function to process the image and output the results."""
    # Try to find a suitable font
    font_paths = [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', #linux
        '/usr/share/fonts/truetype/humor-sans/Humor-Sans.ttf', #colab
        '/System/Library/Fonts/Supplemental/Arial.ttf',  # macOS
        'C:/Windows/Fonts/Arial.ttf',  # Windows
    ]
    font_path = next((path for path in font_paths if os.path.exists(path)), None)
    
    if font_path is None:
        print("Warning: No suitable font found. Text visualization may fail.")
    
    extracted_info, output_path = process_form(image_path, font_path)

    if extracted_info and output_path:
        print(f"Analysis complete. Visualized result saved to: {output_path}")
        
        # Save extracted info to JSON
        json_output_path = os.path.splitext(image_path)[0] + "_output.json"
        save_json(extracted_info, json_output_path)
        
        print(f"Extracted information saved to: {json_output_path}")
        print("\nExtracted Information:")
        for item in extracted_info:
            print(f"Text: {item['text']}")
            print(f"Box: {item['box']}")
            print(f"Confidence: {item['confidence']}")
            print("Entities:")
            for entity, label in item['entities']:
                print(f"  - {entity}: {label}")
            print() 
    else:
        print("Form processing failed.")

main(imagePath)