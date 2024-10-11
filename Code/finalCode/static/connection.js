// let canvas, ctx;
// let layout;
// let startElement = null;
// let elements = {};
// let isDrawing = false;
// let line;

// // Initialize the canvas when the page loads
// window.onload = function() {
//     canvas = new fabric.Canvas('canvas', {
//         selection: false // Disable group selection
//     });
    
//     // Load the image
//     fabric.Image.fromURL(imageUrl, function(img) {
//         canvas.setWidth(img.width);
//         canvas.setHeight(img.height);
//         canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
        
//         // Load layout data
//         loadLayoutData();
//     });

//     // Set up mouse event listeners
//     canvas.on('mouse:down', onMouseDown);
//     canvas.on('mouse:move', onMouseMove);
//     canvas.on('mouse:up', onMouseUp);
// };

// // Load layout data
// function loadLayoutData() {
//     fetch(layoutJsonUrl)
//         .then(response => response.json())
//         .then(data => {
//             layout = data;
//             renderDetections();
//         });
// }

// // Render detection boxes on the canvas
// function renderDetections() {
//     layout.forEach(detection => {
//         const color = detection.Model === 'YOLO' ? 'rgba(255,0,0,0.2)' : 'rgba(0,0,255,0.2)';
//         const rect = new fabric.Rect({
//             left: detection.bbox[0],
//             top: detection.bbox[1],
//             width: detection.bbox[2] - detection.bbox[0],
//             height: detection.bbox[3] - detection.bbox[1],
//             stroke: color.replace('0.2', '1'), // Solid color for border
//             strokeWidth: 2,
//             fill: color,
//             selectable: false,
//             hoverCursor: 'pointer'
//         });
        
//         rect.set('elementData', {
//             uuid: detection.uuid,
//             class: detection.class,
//             confidence: detection.confidence,
//             text: detection.text || "",
//             type: detection.Model,
//             parent: detection.parent || "",
//             child: detection.child || []
//         });
        
//         const text = new fabric.Text(detection.class, {
//             left: detection.bbox[0],
//             top: detection.bbox[1] - 20,
//             fontSize: 16,
//             fill: color.replace('0.2', '1'),
//             selectable: false
//         });
        
//         canvas.add(rect, text);
//         elements[detection.uuid] = rect;
//         addLabel(detection, color.replace('0.2', '1'));
//     });
    
//     // Draw existing connections
//     layout.forEach(detection => {
//         if (detection.child && detection.child.length > 0) {
//             detection.child.forEach(childUuid => {
//                 drawConnection(elements[detection.uuid], elements[childUuid]);
//             });
//         }
//     });
    
//     canvas.renderAll();
// }

// // Add a label to the label list
// function addLabel(detection, color) {
//     const labelList = document.getElementById('labels');
//     const labelElement = document.createElement('div');
//     labelElement.className = "label";
//     labelElement.style.color = color;
//     labelElement.style.marginBottom = "10px";
//     labelElement.style.border = `1px solid ${color}`;
//     labelElement.style.padding = "5px";
//     labelElement.dataset.uuid = detection.uuid;

//     const labelContent = `
//         <strong>Class:</strong> ${detection.class}<br>
//         <strong>UUID:</strong> ${detection.uuid}<br>
//         <strong>Confidence:</strong> ${detection.confidence.toFixed(4)}<br>
//         <strong>Text:</strong> ${detection.text || "N/A"}<br>
//         <strong>Model:</strong> ${detection.Model}<br>
//         <strong>Parent:</strong> ${detection.parent || "N/A"}<br>
//         <strong>Children:</strong> ${detection.child.length > 0 ? detection.child.join(", ") : "N/A"}<br>
//         <strong>Bounding Box:</strong> [${detection.bbox.join(", ")}]
//     `;

//     labelElement.innerHTML = labelContent;
//     labelList.appendChild(labelElement);

//     // Add click event to highlight corresponding rectangle
//     labelElement.addEventListener('click', () => {
//         const rect = elements[detection.uuid];
//         canvas.setActiveObject(rect);
//         canvas.renderAll();
//     });
// }

// // Handle mouse down event
// function onMouseDown(options) {
//     if (options.target && options.target.type === 'rect') {
//         startElement = options.target;
//         isDrawing = true;
//         const pointer = canvas.getPointer(options.e);
//         line = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
//             stroke: 'green',
//             strokeWidth: 2,
//             selectable: false
//         });
//         canvas.add(line);
//     }
// }

// // Handle mouse move event
// function onMouseMove(options) {
//     if (!isDrawing) return;
//     const pointer = canvas.getPointer(options.e);
//     line.set({ x2: pointer.x, y2: pointer.y });
//     canvas.renderAll();
// }

// // Handle mouse up event
// function onMouseUp(options) {
//     if (!isDrawing) return;
//     isDrawing = false;
//     canvas.remove(line);

//     if (options.target && options.target.type === 'rect' && options.target !== startElement) {
//         const endElement = options.target;
//         if (startElement.elementData.type === 'YOLO' && endElement.elementData.type === 'PADDLE') {
//             drawConnection(startElement, endElement);
//             updateRelationship(startElement, endElement);
//         }

//         // Scroll to the corresponding label
//         scrollToLabel(startElement.elementData.uuid);
//     }

//     startElement = null;
//     canvas.renderAll();
// }

// // Scroll to the corresponding label
// function scrollToLabel(uuid) {
//     const labelElement = document.querySelector(`.label[data-uuid="${uuid}"]`);
//     if (labelElement) {
//         labelElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
//     }
// }

// // Draw a connection between two objects
// function drawConnection(start, end) {
//     const line = new fabric.Line([
//         start.left + start.width / 2,
//         start.top + start.height / 2,
//         end.left + end.width / 2,
//         end.top + end.height / 2
//     ], {
//         stroke: 'green',
//         strokeWidth: 2,
//         selectable: false
//     });
    
//     const triangle = new fabric.Triangle({
//         width: 10,
//         height: 15,
//         fill: 'green',
//         left: end.left + end.width / 2,
//         top: end.top + end.height / 2,
//         angle: calculateAngle(start, end)
//     });
    
//     canvas.add(line, triangle);
//     canvas.renderAll();
// }

// // Calculate angle for arrow head
// function calculateAngle(start, end) {
//     return Math.atan2(end.top - start.top, end.left - start.left) * 180 / Math.PI;
// }

// // Update parent-child relationship
// function updateRelationship(parent, child) {
//     // Ensure the parent has a child array
//     if (!parent.elementData.child) {
//         parent.elementData.child = [];
//     }
//     // Add the child's UUID to the parent's child array
//     if (!parent.elementData.child.includes(child.elementData.uuid)) {
//         parent.elementData.child.push(child.elementData.uuid);
//     }

//     // Set the parent property for the child if not already set
//     if (!child.elementData.parent) {
//         child.elementData.parent = parent.elementData.uuid;
//     }
// }

// // Save changes
// function saveChanges() {
//     const updatedLayout = layout.map(item => {
//         const el = elements[item.uuid];
//         return {
//             ...item,
//             bbox: [el.left, el.top, el.left + el.width, el.top + el.height],
//             parent: el.elementData.parent || "",
//             child: el.elementData.child || []
//         };
//     });
    
//     fetch('/save_changes', {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json'
//         },
//         body: JSON.stringify({
//             image_name: imageName,
//             layout: updatedLayout
//         })
//     })
//     .then(response => response.json())
//     .then(result => {
//         alert('Changes saved successfully!');
//     })
//     .catch(error => {
//         console.error('Error:', error);
//         alert('Failed to save changes.');
//     });
// }

// // Attach save changes event listener
// document.getElementById('saveChanges').addEventListener('click', saveChanges);
let canvas, ctx;
let layout;
let startElement = null;
let elements = {};
let isDrawing = false;
let line;

// Initialize the canvas when the page loads
window.onload = function() {
    canvas = new fabric.Canvas('canvas', {
        selection: false // Disable group selection
    });
    
    // Load the image
    fabric.Image.fromURL(imageUrl, function(img) {
        canvas.setWidth(img.width);
        canvas.setHeight(img.height);
        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
        
        // Load layout data
        loadLayoutData();
    });

    // Set up mouse event listeners
    canvas.on('mouse:down', onMouseDown);
    canvas.on('mouse:move', onMouseMove);
    canvas.on('mouse:up', onMouseUp);
};

// Load layout data
function loadLayoutData() {
    fetch(layoutJsonUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            layout = data;
            renderDetections();
        })
        .catch(error => {
            console.error('There was a problem with the fetch operation:', error);
            alert('Failed to load layout data. Please try again.');
        });
}

// Render detection boxes on the canvas
function renderDetections() {
    layout.forEach(detection => {
        const color = detection.Model === 'YOLO' ? 'rgba(255,0,0,0.2)' : 'rgba(0,0,255,0.2)';
        const rect = new fabric.Rect({
            left: detection.bbox[0],
            top: detection.bbox[1],
            width: detection.bbox[2] - detection.bbox[0],
            height: detection.bbox[3] - detection.bbox[1],
            stroke: color.replace('0.2', '1'), // Solid color for border
            strokeWidth: 2,
            fill: color,
            selectable: false,
            hoverCursor: 'pointer'
        });
        
        rect.set('elementData', {
            uuid: detection.uuid,
            class: detection.class,
            confidence: detection.confidence,
            text: detection.text || "",
            type: detection.Model,
            parent: detection.parent || "",
            child: detection.child || []
        });
        
        const text = new fabric.Text(detection.class, {
            left: detection.bbox[0],
            top: detection.bbox[1] - 20,
            fontSize: 16,
            fill: color.replace('0.2', '1'),
            selectable: false
        });
        
        canvas.add(rect, text);
        elements[detection.uuid] = rect;
        addLabel(detection, color.replace('0.2', '1'));
    });
    
    // Draw existing connections
    layout.forEach(detection => {
        if (detection.child && detection.child.length > 0) {
            detection.child.forEach(childUuid => {
                drawConnection(elements[detection.uuid], elements[childUuid]);
            });
        }
    });
    
    canvas.renderAll();
}

// Add a label to the label list
function addLabel(detection, color) {
    const labelList = document.getElementById('labels');
    const labelElement = document.createElement('div');
    labelElement.className = "label";
    labelElement.style.color = color;
    labelElement.style.marginBottom = "10px";
    labelElement.style.border = `1px solid ${color}`;
    labelElement.style.padding = "5px";
    labelElement.dataset.uuid = detection.uuid;

    const labelContent = `
        <strong>Class:</strong> ${detection.class}<br>
        <strong>UUID:</strong> ${detection.uuid}<br>
        <strong>Confidence:</strong> ${detection.confidence.toFixed(4)}<br>
        <strong>Text:</strong> ${detection.text || "N/A"}<br>
        <strong>Model:</strong> ${detection.Model}<br>
        <strong>Parent:</strong> ${detection.parent || "N/A"}<br>
        <strong>Children:</strong> ${detection.child.length > 0 ? detection.child.join(", ") : "N/A"}<br>
        <strong>Bounding Box:</strong> [${detection.bbox.join(", ")}]
    `;

    labelElement.innerHTML = labelContent;
    labelList.appendChild(labelElement);

    // Add click event to highlight corresponding rectangle
    labelElement.addEventListener('click', () => {
        const rect = elements[detection.uuid];
        canvas.setActiveObject(rect);
        canvas.renderAll();
    });
}

// Handle mouse down event
function onMouseDown(options) {
    if (options.target && options.target.type === 'rect') {
        startElement = options.target;
        isDrawing = true;
        const pointer = canvas.getPointer(options.e);
        line = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
            stroke: 'green',
            strokeWidth: 2,
            selectable: false
        });
        canvas.add(line);
    }
}

// Handle mouse move event
function onMouseMove(options) {
    if (!isDrawing) return;
    const pointer = canvas.getPointer(options.e);
    line.set({ x2: pointer.x, y2: pointer.y });
    canvas.renderAll();
}

// Handle mouse up event
function onMouseUp(options) {
    if (!isDrawing) return;
    isDrawing = false;
    canvas.remove(line);

    if (options.target && options.target.type === 'rect' && options.target !== startElement) {
        const endElement = options.target;

        // Only connect if the models are appropriate
        if (startElement.elementData.type === 'YOLO' && endElement.elementData.type === 'PADDLE') {
            // Draw the connection
            drawConnection(startElement, endElement);
            
            // Update the parent-child relationship
            updateRelationship(endElement, startElement); // A becomes child of B
            
            // Scroll to the corresponding label
            scrollToLabel(startElement.elementData.uuid);
        }
    }

    startElement = null;
    canvas.renderAll();
}

// Scroll to the corresponding label
function scrollToLabel(uuid) {
    const labelElement = document.querySelector(`.label[data-uuid="${uuid}"]`);
    if (labelElement) {
        labelElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Draw a connection between two objects
function drawConnection(start, end) {
    const line = new fabric.Line([
        start.left + start.width / 2,
        start.top + start.height / 2,
        end.left + end.width / 2,
        end.top + end.height / 2
    ], {
        stroke: 'green',
        strokeWidth: 2,
        selectable: false
    });
    
    const triangle = new fabric.Triangle({
        width: 10,
        height: 15,
        fill: 'green',
        left: end.left + end.width / 2,
        top: end.top + end.height / 2,
        angle: calculateAngle(start, end)
    });
    
    canvas.add(line, triangle);
    canvas.renderAll();
}

// Calculate angle for arrow head
function calculateAngle(start, end) {
    return Math.atan2(end.top - start.top, end.left - start.left) * 180 / Math.PI;
}

// Update parent-child relationship
function updateRelationship(parent, child) {
    // Ensure the parent has a child array
    if (!parent.elementData.child) {
        parent.elementData.child = [];
    }
    // Add the child's UUID to the parent's child array
    if (!parent.elementData.child.includes(child.elementData.uuid)) {
        parent.elementData.child.push(child.elementData.uuid);
    }

    // Set the parent property for the child
    child.elementData.parent = parent.elementData.uuid; // B becomes parent of A
}

// Save changes
function saveChanges() {
    const updatedLayout = layout.map(item => {
        const el = elements[item.uuid];
        return {
            ...item,
            bbox: [el.left, el.top, el.left + el.width, el.top + el.height],
            parent: el.elementData.parent || "",
            child: el.elementData.child || []
        };
    });
    
    fetch('/save_changes', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            image_name: imageName,
            layout: updatedLayout
        })
    })
    .then(response => response.json())
    .then(result => {
        alert('Changes saved successfully!');
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Failed to save changes.');
    });
}

// Attach save changes event listener
document.getElementById('saveChanges').addEventListener('click', saveChanges);
