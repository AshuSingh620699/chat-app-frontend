document.addEventListener("DOMContentLoaded", () => {
  fetchUserProfile();
});

async function fetchUserProfile() {
  try {
    const res = await fetch('https://chat-app-backend-vf79.onrender.com/api/profile/me', {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to fetch user profile.");

    populateOwnProfile(data);
  } catch (err) {
    console.error(err.message);
  }
}

function populateOwnProfile(user) {
  // Use Cloudinary image if available, else fallback to default Cloudinary URL
  const defaultImage = "https://img.freepik.com/free-vector/blue-circle-with-white-user_78370-4707.jpg";
  
  document.getElementById("userAvatar").src = user.profileImage || defaultImage;
  document.getElementById("profilePreview").src = user.profileImage || defaultImage;
  document.getElementById("updateUsername").textContent = user.username || "No username set";
  document.getElementById("updateBio").textContent = user.bio || "No bio available";  
}

function openModal() {
  document.getElementById('profileModal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('profileModal').classList.add('hidden');
}

document.getElementById('profileUpdateForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('updateUsername').value;
  const bio = document.getElementById('updateBio').value;
  const imageFile = document.getElementById('updateImage').files[0];

  try {
    let imagePath = null;

    if (imageFile) {
      const formData = new FormData();
      formData.append('image', imageFile);

      const imgRes = await fetch('https://chat-app-backend-vf79.onrender.com/api/user/upload-profile-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionStorage.getItem('token')}`
        },
        body: formData
      });

      const imgData = await imgRes.json();
      if (!imgRes.ok) throw new Error(imgData.message || "Image upload failed");
      imagePath = imgData.profileImage;
    }

    const profileRes = await fetch('https://chat-app-backend-vf79.onrender.com/api/profile/update', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionStorage.getItem('token')}`
      },
      body: JSON.stringify({ username, bio, profileImage: imagePath })
    });

    const profileData = await profileRes.json();

    if (profileRes.ok) {
      alert('Profile updated!');
      closeModal();
      fetchUserProfile(); // Refresh profile
    } else {
      alert(profileData.message || 'Failed to update profile');
    }
  } catch (err) {
    console.error(err);
    alert('Error updating profile');
  }
});

function openImageOptions() {
  document.getElementById('updateImage').click();
}

document.getElementById('updateImage').addEventListener('change', function(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      document.getElementById('profilePreview').src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
});
