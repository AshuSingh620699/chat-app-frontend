const fileInput = document.getElementById('fileInput');
const previewContainerId = 'filePreviewPopup';

fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file || !currentChatUser) return;

    showPreviewPopup(file);
});

function showPreviewPopup(file) {
    // Remove any existing popup
    document.getElementById(previewContainerId)?.remove();

    const popup = document.createElement('div');
    popup.id = previewContainerId;
    popup.className = 'file-preview-popup';

    const fileURL = URL.createObjectURL(file);
    const isImage = file.type.startsWith('image/');
    const filename = file.name;

    popup.innerHTML = `
        <div class="popup-header">
            <strong>File Preview</strong>
            <button class="close-btn" onclick="document.getElementById('${previewContainerId}').remove()">✖</button>
        </div>
        <div class="popup-body">
            ${isImage ? `<img src="${fileURL}" class="popup-image-preview">` :
            `<div class="file-info"><strong>${filename}</strong><br><small>${file.type}</small></div>`}
            <textarea id="captionInput" placeholder="Add a caption..."></textarea>
        </div>
        <div class="popup-actions">
            <button onclick="uploadFileWithCaption()">Send</button>
        </div>
    `;

    document.querySelector('.chat-area').appendChild(popup);
}

async function uploadFileWithCaption() {
    const file = fileInput.files[0];
    const caption = document.getElementById('captionInput')?.value || '';

    if (!file || !currentChatUser) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('receiverId', currentChatUser._id);
    formData.append('text', caption);

    try {
        const res = await fetch(`https://chat-app-backend-vf79.onrender.com/api/share/share-file`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData
        });

        const data = await res.json();
        if (!res.ok) throw new Error('Failed to upload');

        // Render file in chat
        renderFileMessage(data, 'sent');
        document.getElementById(previewContainerId)?.remove();
        fileInput.value = '';
    } catch (err) {
        console.error('Upload failed:', err);
    }
}

function renderFileMessage(message, type) {
    const div = document.createElement('div');
    div.className = `message ${type}`;

    const isImage = message.file?.fileType?.startsWith('image/');
    let content = '';

    if (isImage) {
        content = `<img src="${message.file.url}" alt="Image" class="file-image">`;
    } else {
        content = `<a href="${message.file.url}" target="_blank" class="file-link">${message.file.fileName || 'Download File'}</a>`;
    }

    div.innerHTML = `
        <div class="message-content">${message.content || ''}</div>
        <div class="file-message">${content}</div>
        <span class="message-meta">
            <span class="message-time">${formatTime(message.timestamp)}</span>
            <span class="message-status status-sent" data-id="${message._id}">✅</span>
        </span>
    `;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}
