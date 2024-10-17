const fileInput = document.getElementById('image-upload');
const previewContainer = document.querySelector('.image-preview-container');
const preview = document.querySelector('.image-preview');
const removeButton = document.querySelector('.remove-image-btn');
const fileInputLabel = document.querySelector('.file-input-label');
let templateToDelete = null;

fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            previewContainer.classList.add('active');
            fileInputLabel.classList.add('hidden');
        }
        reader.readAsDataURL(file);
    }
});

removeButton.addEventListener('click', function() {
    fileInput.value = '';
    preview.src = '';
    previewContainer.classList.remove('active');
    fileInputLabel.classList.remove('hidden');
});

// Drag and drop functionality
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    fileInputLabel.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    fileInputLabel.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
    fileInputLabel.addEventListener(eventName, unhighlight, false);
});

function highlight(e) {
    fileInputLabel.style.borderColor = '#2cb67d';
    fileInputLabel.style.backgroundColor = '#2d2f33';
}

function unhighlight(e) {
    fileInputLabel.style.borderColor = '#7f5af0';
    fileInputLabel.style.backgroundColor = '#242629';
}

fileInputLabel.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    fileInput.files = files;
    
    if (files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            previewContainer.classList.add('active');
            fileInputLabel.classList.add('hidden');
        }
        reader.readAsDataURL(files[0]);
    }
}
function deleteTemplate(templateName, event) {
    event.stopPropagation(); // Prevent triggering the card click
    templateToDelete = templateName;
    document.getElementById('deleteModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('deleteModal').style.display = 'none';
    templateToDelete = null;
}

function confirmDelete() {
    if (!templateToDelete) return;

    fetch(`/delete_template/${templateToDelete}`, {
        method: 'DELETE',
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Remove the template card from the UI
            const card = document.getElementById(templateToDelete);
            card.remove();
            
            // Show success message (optional)
            // alert('Template deleted successfully');
        } else {
            alert('Error deleting template: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error deleting template');
    })
    .finally(() => {
        closeModal();
    });
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('deleteModal');
    if (event.target == modal) {
        closeModal();
    }
}