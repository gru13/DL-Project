let layout = [];
let canvas;
let elementDict = [];
let imageFile ;
// Initialize everything when the page loads
window.onload = function() {
    initCanvas();
    loadLayoutData()
    .then(() => {
        console.log('Layout data loaded successfully');
        updateJsonList();
    })
    .catch(error => {
        console.error('Error during initialization:', error);
    });
    updateJsonList();
};

// Function to initialize Fabric canvas
function initCanvas() {
    canvas = new fabric.Canvas('canvas', {
        selection: false,
        hoverCursor: 'pointer'
    });
}

// Function to load image into the canvas from user input
function loadImageFromFile(file) {
    const reader = new FileReader();

    reader.onload = function(event) {
        fabric.Image.fromURL(event.target.result, function(img) {
            // Set canvas size to match the image dimensions
            canvas.setWidth(img.width);
            canvas.setHeight(img.height);
            
            // Set the image as canvas background
            canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
                scaleX: 1,
                scaleY: 1
            });

            // After the image is loaded, render the bounding boxes
            renderDetections();

            document.getElementById('inputForm').style.display = 'none';
            document.getElementById('extractData').style.display = 'block';
        });
    };

    reader.readAsDataURL(file);
}

// Modified loadLayoutData to return a Promise
async function loadLayoutData() {
    document.getElementById('extractData').style.display = 'none';
    try {
        const response = await fetch(layoutJsonUrl);
        if (!response.ok) {
            throw new Error('Failed to load layout JSON from ' + layoutJsonUrl);
        }
        const data = await response.json();
        layout = data;
        renderLabelDetails();
        addCanvasClickListener();
        return true; // Indicate successful loading
    } catch (error) {
        console.error('Error loading JSON:', error);
        alert('Failed to load layout data. Please try again.');
        throw error;  // Re-throw the error to be caught by the caller
    }
}

// Function to render detections (bounding boxes) on the canvas
function renderDetections() {
    // Clear all objects except background
    canvas.getObjects().slice().forEach(obj => {
        canvas.remove(obj);
    });

    // First, draw all the bounding boxes and labels
    layout.forEach(detection => {
        const bbox = detection.bbox;
        const model = detection.Model;

        // Set colors based on model
        const fillColor = model === 'YOLO' ? 'rgba(255,0,0,0.1)' :
                         model === 'PADDLE' ? 'rgba(0,0,255,0.1)' :
                         'rgba(0,255,0,0.1)';
        const strokeColor = model === 'YOLO' ? 'red' :
                          model === 'PADDLE' ? 'blue' :
                          'green';

        // Create rectangle for bounding box
        const rect = new fabric.Rect({
            left: bbox[0],
            top: bbox[1],
            width: bbox[2] - bbox[0],
            height: bbox[3] - bbox[1],
            fill: fillColor,
            stroke: strokeColor,
            strokeWidth: 2,
            selectable: false,
            uuid: detection.uuid
        });

        // Create text label
        const text = new fabric.Text(detection.class, {
            left: bbox[0],
            top: bbox[1] - 20,
            fontSize: 16,
            fill: 'black',
            selectable: false
        });

        canvas.add(rect, text);
    });

    // Draw connection lines with arrows
    layout.forEach(detection => {
        if (detection.parent) {
            const parentDetection = layout.find(item => item.uuid === detection.parent);
            if (parentDetection) {
                const childBbox = detection.bbox;
                const parentBbox = parentDetection.bbox;

                const childCenter = {
                    x: (childBbox[0] + childBbox[2]) / 2,
                    y: (childBbox[1] + childBbox[3]) / 2
                };
                const parentCenter = {
                    x: (parentBbox[0] + parentBbox[2]) / 2,
                    y: (parentBbox[1] + parentBbox[3]) / 2
                };

                drawArrowLine(childCenter, parentCenter);
            }
        }
    });

    canvas.renderAll();
}

// Function to draw an arrow line between two points
function drawArrowLine(from, to) {
    const headLength = 10;
    const angle = Math.atan2(to.y - from.y, to.x - from.x);

    // Create the main line
    const line = new fabric.Line([from.x, from.y, to.x, to.y], {
        stroke: 'green',
        strokeWidth: 2,
        selectable: false
    });

    // Create arrowhead
    const arrowHead = new fabric.Triangle({
        left: to.x,
        top: to.y,
        pointType: 'arrow_start',
        angle: (angle * 180 / Math.PI) + 90,
        width: headLength,
        height: headLength * 2,
        fill: 'green',
        selectable: false
    });

    // Add both to canvas
    canvas.add(line, arrowHead);
}

// Function to add click listener to the canvas
function addCanvasClickListener() {
    canvas.on('mouse:down', function(options) {
        if (options.target && options.target.uuid) {
            focusOnLabel(options.target.uuid);
        }
    });
}

// Function to render label details in the sidebar
function renderLabelDetails() {
    const labelList = document.getElementById('labelList');
    labelList.innerHTML = '';

    layout.forEach(detection => {
        const li = document.createElement('div');
        li.className = 'label';
        li.id = `label-${detection.uuid}`;
        li.innerHTML = `
            <div><strong>UUID:</strong> ${detection.uuid}</div>
            <div><strong>Class:</strong> ${detection.class}</div>
            <div><strong>Text:</strong> ${detection.text}</div>
        `;
        if (detection.Model === 'YOLO') {
            li.innerHTML += `<div><strong>Parent:</strong> ${detection.parent}</div>`;
            li.classList.add("yolo");
        } else {
            li.innerHTML += `<div><strong>Child:</strong><br><hr><center>${detection.child.join("<br><hr>")}<br><hr></center></div>`;
            li.classList.add("paddle");
        }
        labelList.appendChild(li);
    });
}

// Function to focus on and scroll to a label
function focusOnLabel(uuid) {
    const labelElement = document.getElementById(`label-${uuid}`);
    if (labelElement) {
        labelElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        labelElement.classList.add('highlighted');
        setTimeout(() => {
            labelElement.classList.remove('highlighted');
        }, 2000);
    }
}

// Function to update the layout based on the backend response
function updateLayoutWithRecognizedText(updatedLayout) {
    updatedLayout.forEach(updatedItem => {
        for (let index = 0; index < layout.length; index++) {
            if (layout[index]['uuid'] === updatedItem['uuid']) {
                layout[index]['text'] = updatedItem.text;
            }
        }
    });
}

// Event Listeners
document.getElementById('image-upload').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        loadImageFromFile(file);
    }
});

document.getElementById('extractData').addEventListener('click', async function() {
    const emptyTextElements = layout.filter(detection => detection.text.trim() === '');
    console.log("kff")
    if (emptyTextElements.length === 0) {
        alert('No elements with empty text found.');
        return;
    }
    const imageInput = document.getElementById('image-upload');
    imageFile = imageInput.files[0];
    await sendDataToFlask(emptyTextElements, imageFile);
});



// Function to send data to Flask backend
async function sendDataToFlask(data, imageFile) {
    const formData = new FormData();
    formData.append('layout', JSON.stringify(data));
    formData.append('image', imageFile);

    try {
        const response = await fetch('/process-empty-text-elements', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Error with request: ' + response.statusText);
        }

        const result = await response.json();
        console.log('Success:', result);
        alert('Data and image processed successfully.');

        updateLayoutWithRecognizedText(result.updated_layout);
        renderLabelDetails();
        renderDetections();
        updateJsonList();
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while sending data and image to the backend.');
    }
}



function mapTextToAllElements() {
    console.log('Starting mapTextToAllElements...');
    console.log('Current layout:', layout);
    // Array to store mapped elements
    elementDict = [];
    // Iterate through each element in the layout
    layout.forEach(element => {
        // Only process YOLO elements (elements with parents)
        if (element.parent != '' || !element.child){
            return;
        }
        
        // Create an object for current element
        const currentElement = {
            parent: {
                uuid: element.uuid,
                text: element.text || ''
            },
            children: []
        };
        
        // Find and add children if they exist
        if (element.child && Array.isArray(element.child)) {
            element.child.forEach(childUUID => {
                const childElement = layout.find(el => el.uuid === childUUID);
                if (childElement) {
                    currentElement.children.push({
                        uuid: childElement.uuid,
                        text: childElement.text || ''
                    });
                }
            });
        }
        
        elementDict.push(currentElement);
    });

    return elementDict;
}

function updateJsonList() {
    const jsonList = document.getElementById('jsonList');
    const mappedData = mapTextToAllElements();
    
    jsonList.innerHTML = '';
    
    mappedData.forEach(item => {
        const jsonItem = createJsonItem(item);
        jsonList.appendChild(jsonItem);
    });

    // Add button to add new items
    const addButton = document.createElement('button');
    addButton.textContent = 'Add New Item';
    addButton.className = 'add-button';
    addButton.addEventListener('click', () => addNewJsonItem(jsonList));
    jsonList.appendChild(addButton);
}

function createJsonItem(item) {
    const jsonItem = document.createElement('div');
    jsonItem.className = 'label';
    
    // Create parent element section
    const parentSection = document.createElement('div');
    parentSection.className = 'parent-section';
    parentSection.innerHTML = `
        <div class="parent-header">
            <span>Parent:</span>
            <input type="text" class="parent-text" value="${item.parent.text}" placeholder="Parent Text">
        </div>
    `;

    // Add onchange event to parent input
    const parentInput = parentSection.querySelector('.parent-text');
    parentInput.addEventListener('change', (e) => {
        item.parent.text = e.target.value;  // Update the text in the elementDict
    });

    // Create children section
    const childrenSection = document.createElement('div');
    childrenSection.innerHTML += '<span>Children:</span>';
    childrenSection.className = 'children-section';
    item.children.forEach(child => {
        const childElement = document.createElement('div');
        childElement.className = 'child-item';
        childElement.innerHTML = `
            <input type="text" class="child-text" value="${child.text}" placeholder="Child Text">
        `;
        
        // Add onchange event to child input
        const childInput = childElement.querySelector('.child-text');
        childInput.addEventListener('change', (e) => {
            child.text = e.target.value; // Update the child text in the elementDict
        });

        childrenSection.appendChild(childElement);
    });

    // Add remove button
    const removeButton = document.createElement('button');
    removeButton.textContent = 'Remove';
    removeButton.className = 'remove-item';
    removeButton.addEventListener('click', () => jsonItem.remove());

    // Combine all sections
    jsonItem.appendChild(parentSection);
    jsonItem.appendChild(childrenSection);
    jsonItem.appendChild(removeButton);

    return jsonItem;
}


function addNewJsonItem(container) {
    const newItem = {
        parent: {
            uuid: uuidv4(),
            text: ''
        },
        children: []
    };
    const jsonItem = createJsonItem(newItem);
    container.insertBefore(jsonItem, container.lastElementChild);
}

function saveJsonFile() {
    const jsonData = {};
    const jsonItems = document.querySelectorAll('#jsonList .label'); // Find all 'label' divs inside #jsonList


    // Iterate through each parent-child group
    jsonItems.forEach(item => {
        const parentText = item.querySelector('.parent-text').value.trim(); // Get the parent text

        // Initialize parent text in jsonData if it doesn't already exist
        if (!jsonData[parentText]) {
            jsonData[parentText] = "";
        }

        // Get all child text fields related to the parent
        const childTexts = item.querySelectorAll('.child-text');
        childTexts.forEach(child => {
            const childText = child.value.trim();
            jsonData[parentText] += childText + "  "; // Append child text to the parent field
        });
    });

    // Save the data as a JSON file
    const jsonString = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'mapped_data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log(jsonData); // Output to console for debugging
}


async function updateExcel() {
    // Get the image file from the input field
    const imageInput = document.getElementById('image-upload');
    imageFile = imageInput.files[0];

    // Check if the image file exists
    if (!imageFile) {
        alert('Please upload an image before submitting.');
        return; // Exit the function if no image is found
    }

    // Check if layout and elementDict are valid
    if (!layout || layout.length === 0) {
        alert('Layout data is missing. Please load the layout data before submitting.');
        return;
    }

    if (!elementDict || elementDict.length === 0) {
        alert('Element data is missing. Please ensure elementDict is populated before submitting.');
        return;
    }

    // Create FormData object to send data to the backend
    const formData = new FormData();
    formData.append('layout', JSON.stringify(layout));
    formData.append('elementDict', JSON.stringify(elementDict));
    formData.append('image', imageFile);
    formData.append('template', templateName);

    try {
        // Send data to the Flask backend using fetch
        const response = await fetch('/update-excel', {
            method: 'POST',
            body: formData
        });

        // Handle the response
        if (!response.ok) {
            throw new Error('Error with request: ' + response.statusText);
        }

        const result = await response.json();
        console.log('Success:', result);
        alert('Data and image updated successfully.');
    } catch (error) {
        // Handle any errors during the request
        console.error('Error:', error);
        alert('An error occurred while sending data and image to the backend.');
    }
}
