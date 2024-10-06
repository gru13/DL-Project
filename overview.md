### Abstract

This project introduces a system designed to automate the extraction of handwritten data from physical forms into structured JSON files. The process starts with an initial pass where a form’s layout is analyzed and a template is created. First, Tesseract OCR is used to extract the input labels from the form (e.g., “Name,” “Date of Birth,” etc.). Simultaneously, YOLOv8 detects the locations of input fields, such as text boxes and checkboxes. To merge the two outputs, DocTR (Document Text Recognition) is used to create an integrated layout, associating input fields with their corresponding labels. The system allows users to manually verify and modify the mappings through a user interface. Once confirmed, the layout is stored as a template in JSON format. For subsequent forms of the same type, this template is used to skip the layout detection and directly extract text using TrOCR. The system outputs a structured JSON with labels and corresponding values, providing a fast and accurate method for handling handwritten data from repetitive form types.

### Methodology

#### 1. **Initial Form Layout Analysis (First-Time Processing)**

When the system processes a new type of form for the first time, it needs to understand the layout and label associations. This is accomplished through a two-part approach:

- **Label Extraction with Tesseract OCR**: Tesseract OCR is first applied to the entire form to identify input labels. These labels, like “Name,” “Address,” or “Signature,” are recognized by Tesseract OCR and marked with bounding boxes that denote their positions on the form.
  
- **Form Field Detection with YOLOv8**: Simultaneously, YOLOv8 is applied to detect various input fields, such as text boxes, checkboxes, or radio buttons. Each detected field is given a bounding box, which marks the position where the user is expected to input data.

#### 2. **Merging Layout Information with DocTR**

Once the input labels are extracted from Tesseract OCR and the input fields are detected with YOLOv8, the system uses DocTR to combine these two sets of data. DocTR, which excels in layout understanding, ensures that each label is correctly matched with its respective input field based on proximity and document structure. For example, the label “Name” extracted by Tesseract is associated with the text box detected by YOLOv8 that is closest or most logically connected to it.

This step generates a comprehensive map of the form that includes both the labels and the input fields, creating an accurate template that aligns with the physical form.

#### 3. **User Verification and Template Storage**

After the layout is constructed, the system presents it to the user via a user interface for verification. The user is shown the detected labels, the form fields, and the matched associations. If there are any inaccuracies in the automatic matching (for example, if a label is incorrectly associated with an input field), the user can adjust the associations manually.

Once the user is satisfied with the results, the system stores the template in JSON format. The JSON template includes both the labels and the coordinates of the input fields. This stored layout serves as a reference for subsequent processing of the same form type.

#### 4. **Subsequent Processing Using the Template**

Once a template is created for a specific form type, it can be reused for future instances of the same form. For these subsequent forms, the system skips the label and field detection phase and instead directly uses the stored template. The pre-defined coordinates allow the system to immediately locate the form’s input fields.

#### 5. **Text Extraction with TrOCR**

With the layout template in place, TrOCR (a Transformer-based OCR model) is used to extract the handwritten or printed text from the input fields. TrOCR processes the areas defined by the stored template’s coordinates and recognizes the handwritten text with high accuracy.

The extracted text is then mapped to the labels based on the form template. For example, the text extracted from the field at the coordinates corresponding to the “Name” label will be assigned to that label.

#### 6. **Generating the Final JSON Output**

After the text is extracted from the form, the system compiles the data into a structured JSON file. Each field in the form is represented by a label (extracted from the initial template) and its corresponding value (extracted from the form input). The JSON file might look like this:

```json
{
  "Name": "John Doe",
  "Date of Birth": "01/01/1990",
  "Signature": "John Doe"
}
```

This structured JSON format is easy to integrate with databases and other digital systems, allowing for efficient data management and accessibility.

#### 7. **Continuous Testing and Improvement**

The system undergoes rigorous testing with diverse form types and handwriting samples to ensure robustness. Feedback loops from the user verification stage inform improvements in the label-field matching process and OCR accuracy. This iterative process ensures that the system can handle a wide variety of forms with minimal manual intervention.

### Key Inference

This system introduces an efficient approach to automating the extraction of handwritten form data, particularly when dealing with repetitive form types. By combining Tesseract OCR for label recognition, YOLOv8 for field detection, and DocTR for layout understanding, the system generates reusable form templates that significantly streamline the data extraction process. For each form type, only the initial pass requires manual verification and template creation. Afterward, the system can accurately and efficiently process subsequent forms using the stored template, extracting handwritten data with TrOCR. 

This approach reduces manual data entry, increases the accuracy of data extraction, and allows for seamless integration with digital databases. By providing a system that balances automation with the option for manual review, the project offers a robust solution for digitizing large volumes of handwritten forms across industries like healthcare, education, and finance.