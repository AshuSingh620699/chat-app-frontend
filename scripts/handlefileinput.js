let selectedFile = null;

fileInput.addEventListener('change', (event) => {
  selectedFile = fileInput.files[0];
  if (!selectedFile) return;

  const preview = document.getElementById('previewArea');
  preview.innerHTML = '';

  if (selectedFile.type.startsWith('image/')) {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(selectedFile);
    preview.appendChild(img);
  } else {
    const text = document.createElement('p');
    text.textContent = `File: ${selectedFile.name}`;
    preview.appendChild(text);
  }

  document.getElementById('filePreviewModal').classList.remove('hidden');
});

function closePreview() {
  document.getElementById('filePreviewModal').classList.add('hidden');
  document.getElementById('captionInput').value = '';
  selectedFile = null;
}

async function uploadFileWithCaption() {
  if (!selectedFile || !currentChatUser) return;

  const formData = new FormData();
  formData.append('file', selectedFile);
  formData.append('receiverId', currentChatUser._id);
  formData.append('text', document.getElementById('captionInput').value);

  try {
    const res = await fetch(`${apiUrl}/api/chat/send-file`, {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    });

    const data = await res.json();
    if (!res.ok) throw new Error('Failed to send file');

    renderFileMessage(data, 'sent');
    closePreview();
  } catch (err) {
    console.error('File upload failed:', err);
  }
}


function renderFileMessage(message, type) {
    const div = document.createElement('div');
    div.className = `message ${type}`;

    let contentHtml = '';
    if (message.content) {
        contentHtml = `
            <div class="file-message">
                <a href="${message.file.url}" target="_blank" class="file-link">
                    <span class="file-name">${message.file.fileName}</span>
                    <span class="file-type">(${message.file.fileType})</span>
                </a>
            </div>
        `;
    }

    // Check if the file is an image
    if (message.file?.fileType?.startsWith('image/')) {
        contentHtml = `
            <div class="file-message">
                <img src="${message.file.url}" alt="${message.file.fileName}" class="file-image">
            </div>
        `;
    }
    else {
        contentHtml = `
            <div class="file-message">
                <a href="${message.file.url}" target="_blank" class="file-link">
                    <span class="file-name">${message.file?.fileName || 'Download File'}</span>
                    <span class="file-type">(${message.file.fileType})</span>
                </a>
            </div>
        `;
    }
    div.innerHTML = contentHTML;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}