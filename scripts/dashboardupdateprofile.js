// Retrieving username, Bio and Profile-Picture
document.addEventListener("DOMContentLoaded", () => {
  fetchUserProfile();
})
async function fetchUserProfile() {
  const res = await fetch('http://localhost:5050/api/profile/me', {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionStorage.getItem('token')}`
    }
  })
  const data = await res.json();

  if (!res.ok) {
    throw new Error("Failed to fetch user profile.");
  }
  populateOwnProfile(data)
}

function populateOwnProfile(user) {
  document.getElementById("userName").textContent = user.username || "Your Name";
  document.getElementById("userBio").textContent = user.bio || "No bio set.";
  if(user.profileImage){
  document.getElementById("userAvatar").src = `http://localhost:5050${user.profileImage}`
  }else{
    document.getElementById("userAvatar").src = `http://localhost:5050/Images/user.jpeg`
  }
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

      const imgRes = await fetch('http://localhost:5050/api/user/upload-profile-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionStorage.getItem('token')}`
        },
        body: formData
      });

      const imgData = await imgRes.json();
      imagePath = imgData.profileImage;
    }

    const profileRes = await fetch('http://localhost:5050/api/profile/update', {
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
      // optionally refresh profile card
    } else {
      alert(profileData.message || 'Failed to update profile');
    }
  } catch (err) {
    console.error(err);
    alert('Error updating profile');
  }
});