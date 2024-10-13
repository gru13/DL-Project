let layout = [];

// Function to load image into the canvas from user input
function loadImageFromFile(file) {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const reader = new FileReader();
    const image = new Image();

    reader.onload = function (event) {
        image.onload = function () {
            // Set canvas size to match the image dimensions
            canvas.width = image.width;
            canvas.height = image.height;

            // Draw the image onto the canvas
            ctx.drawImage(image, 0, 0);

            // After the image is drawn, render the bounding boxes
            renderDetections();

            // Hide the file input after the image is loaded
            document.getElementById('imageInput').style.display = 'none';
            document.getElementById('extractData').style.display = 'block';

        };
        image.src = event.target.result; // Set the image source to the file data
    };

    reader.readAsDataURL(file);  // Read the file as a data URL
}

// Load JSON data when the page loads
function loadLayoutData() {
    // Fetch the JSON data using the passed URL
    fetch(layoutJsonUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load layout JSON from ' + layoutJsonUrl);
            }
            return response.json();  // Parse the JSON response
        })
        .then(data => {
            layout = data; // Assign the data to the 'layout' variable or use it as needed
            renderLabelDetails(); // Render label details after data is loaded
            addCanvasClickListener(); // Add click listener to the canvas
        })
        .catch(error => {
            console.error('Error loading JSON:', error);
            alert('Failed to load layout data. Please try again.');
        });
}

// Function to render detections (bounding boxes) on the canvas
function renderDetections() {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    // First, draw all the bounding boxes and labels
    layout.forEach(detection => {
        const bbox = detection.bbox;
        const model = detection.Model;

        // Set the style for the bounding box fill based on the Model
        if (model === 'YOLO') {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';  // Red with 90% opacity
            ctx.strokeStyle = 'red';  // Red border for bbox
        } else if (model === 'PADDLE') {
            ctx.fillStyle = 'rgba(0, 0, 255, 0.1)';  // Blue with 90% opacity
            ctx.strokeStyle = 'blue';  // Blue border for bbox
        } else {
            ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';  // Green as a fallback (if no model matches)
            ctx.strokeStyle = 'green';
        }

        ctx.lineWidth = 2;

        // Fill the bounding box with the semi-transparent color
        ctx.fillRect(bbox[0], bbox[1], bbox[2] - bbox[0], bbox[3] - bbox[1]);

        // Draw the bounding box (bbox: [x1, y1, x2, y2])
        ctx.strokeRect(bbox[0], bbox[1], bbox[2] - bbox[0], bbox[3] - bbox[1]);

        // Optionally, add the label/class name above the bbox
        ctx.fillStyle = 'black';
        ctx.font = '16px Arial';
        ctx.fillText(detection.class, bbox[0], bbox[1] - 10); // Display class above the bounding box
    });

    // Now, draw the green lines with arrowheads between parent and child elements
    layout.forEach(detection => {
        // Check if the detection has a parent
        if (detection.parent) {
            const parentDetection = layout.find(item => item.uuid === detection.parent);
            if (parentDetection) {
                // Calculate the center of the parent bounding box
                const parentBbox = parentDetection.bbox;
                const parentCenterX = (parentBbox[0] + parentBbox[2]) / 2;
                const parentCenterY = (parentBbox[1] + parentBbox[3]) / 2;

                // Calculate the center of the child bounding box (current detection)
                const childBbox = detection.bbox;
                const childCenterX = (childBbox[0] + childBbox[2]) / 2;
                const childCenterY = (childBbox[1] + childBbox[3]) / 2;

                // Draw a green line connecting the child to the parent
                ctx.strokeStyle = 'green';  // Set the line color to green
                ctx.lineWidth = 2;          // Set the line width
                ctx.beginPath();
                ctx.moveTo(childCenterX, childCenterY);  // Start at child center
                ctx.lineTo(parentCenterX, parentCenterY);  // Draw to parent center
                ctx.stroke();  // Actually draw the line

                // Now draw the arrowhead at the parent point
                drawArrowhead(ctx, childCenterX, childCenterY, parentCenterX, parentCenterY);
            }
        }
    });
}

// Function to draw an arrowhead pointing from (x0, y0) to (x1, y1)
function drawArrowhead(ctx, x0, y0, x1, y1) {
    const headLength = 10;  // Length of the arrowhead
    const dx = x1 - x0;
    const dy = y1 - y0;
    const angle = Math.atan2(dy, dx);  // Angle of the line

    ctx.beginPath();
    ctx.moveTo(x1, y1);  // Arrow tip (at parent)

    // Draw the two lines of the arrowhead
    ctx.lineTo(x1 - headLength * Math.cos(angle - Math.PI / 6), y1 - headLength * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - headLength * Math.cos(angle + Math.PI / 6), y1 - headLength * Math.sin(angle + Math.PI / 6));

    ctx.stroke();
}

// Function to render label details in the sidebar
function renderLabelDetails() {
    const labelList = document.getElementById('labelDetails');
    labelList.innerHTML = ''; // Clear previous details

    // Loop through each detection and add details to the list
    layout.forEach(detection => {
        const li = document.createElement('li');
        li.className = 'label';
        li.id = `label-${detection.uuid}`; // Add an ID to each label element
        li.innerHTML = `
            <div> <strong>UUID:</strong> ${detection.uuid}</div>
            <div> <strong>Class:</strong> ${detection.class}</div>
            <div> <strong>Text:</strong> ${detection.text}</div>
        `;
        if(detection.Model === 'YOLO'){
            li.innerHTML += '<div> <strong>Parent:</strong>'+detection.parent+'</div>';
            li.style.color = 'rgba(255, 0, 0, 0.7)';
        }else{
            li.innerHTML += '<div> <strong>Child:</strong><br><hr><center>' +detection.child.join("<br><hr>") +'<br><hr></center></div>';
            li.style.color = 'rgba(0, 0, 255, 0.7)';
        }
        labelList.appendChild(li);
    });
}

// Function to add click listener to the canvas
function addCanvasClickListener() {
    const canvas = document.getElementById('canvas');
    canvas.addEventListener('click', function(event) {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // Find the clicked element
        const clickedElement = layout.find(detection => {
            const bbox = detection.bbox;
            return x >= bbox[0] && x <= bbox[2] && y >= bbox[1] && y <= bbox[3];
        });

        if (clickedElement) {
            focusOnLabel(clickedElement.uuid);
        }
    });
}

// Function to focus on and scroll to a label
function focusOnLabel(uuid) {
    const labelElement = document.getElementById(`label-${uuid}`);
    if (labelElement) {
        labelElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        labelElement.style.backgroundColor = 'yellow'; // Highlight the focused label
        setTimeout(() => {
            labelElement.style.backgroundColor = ''; // Remove highlight after a short delay
        }, 2000);
    }
}

// Add event listener for the file input
document.getElementById('imageInput').addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (file) {
        loadImageFromFile(file);
    }
});

// Add event listener for the 'extractData' button
document.getElementById('extractData').addEventListener('click', async function () {
    // Filter the elements in the layout where 'text' is empty
    const emptyTextElements = layout.filter(detection => detection.text.trim() === '');

    // If no empty text elements are found, alert the user
    if (emptyTextElements.length === 0) {
        alert('No elements with empty text found.');
        return;
    }

    // Get the image file from the file input
    const imageInput = document.getElementById('imageInput');
    const imageFile = imageInput.files[0];

    // Send the filtered data and image to the Flask backend
    await sendDataToFlask(emptyTextElements, imageFile);
});

// Function to send the filtered data and image to the Flask backend
async function sendDataToFlask(data, imageFile) {
    const formData = new FormData();

    // Append the JSON data (layout with empty text) to the FormData object
    formData.append('layout', JSON.stringify(data));

    // Append the image file to the FormData object
    formData.append('image', imageFile);

    try {
        // Send the FormData to the Flask backend and wait for the response
        const response = await fetch('/process-empty-text-elements', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Error with request: ' + response.statusText);
        }

        // Parse the JSON response from Flask
        const result = await response.json();

        // Display success message and log the result
        console.log('Success:', result);
        alert('Data and image processed successfully.');

        // Update the layout with the returned updated_layout from the backend
        updateLayoutWithRecognizedText(result.updated_layout);

        // Re-render label details and bounding boxes
        renderLabelDetails();
        renderDetections();
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while sending data and image to the backend.');
    }
}

// Function to update the layout based on the backend response
function updateLayoutWithRecognizedText(updatedLayout) {
    updatedLayout.forEach(updatedItem => {
        // Find the item in the original layout by UUID
        for (let index = 0; index < layout.length; index++) {
            if(layout[index]['uuid'] === updatedItem['uuid']){
                layout[index]['text'] = updatedItem.text
            }
        }
    });
}


// Start loading layout data after the page loads
window.onload = loadLayoutData;