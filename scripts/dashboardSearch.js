const searchInput = document.getElementById("searchInput")
const searchResults = document.getElementById('searchResults')
const profileCard = document.getElementById('profileCard')


const createUserCard = (user) => {
    const card = document.createElement("div");
    card.classList.add("search-item");

    const profileImg = document.createElement("img");
    if (user.profileImage) {
        profileImg.src = `http://localhost:5050${user.profileImage}`
    } else {
        profileImg.src = "http://localhost:5050/Images/user.jpeg"; // fallback
    }
    profileImg.alt = `${user.username}'s profile picture`;
    profileImg.style.width = "40px";
    profileImg.style.height = "40px";
    profileImg.style.borderRadius = "50%";
    profileImg.style.marginRight = "10px";

    const nameSpan = document.createElement("span");
    nameSpan.textContent = user.username;

    card.appendChild(profileImg);
    card.appendChild(nameSpan);

    // add event listener to open profile or chat
    // card.addEventListener("click", () => openChat(user));

    return card;
};
searchInput.addEventListener('input', async () => {
    const query = searchInput.value.trim();
    if (query.length < 2) {
        searchResults.innerHTML = ''
        return
    }

    try {
        const res = await fetch(`http://localhost:5050/api/search/search?username=${query}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!res.ok) {
            throw new Error(`HTTP error ${res.status}`);
        }
        const users = await res.json()

        searchResults.innerHTML = ''

        users.forEach(user => {
            const div = createUserCard(user)
            div.onclick = () => {
                showUserProfile(user)
            }
            searchResults.appendChild(div)
        });
    } catch (err) {
        console.error('Search Error:', err)
    }
});

async function showUserProfile(user) {
    // Clear Previous
    profileCard.innerHTML = '';
    profileCard.classList.remove('hidden')

    // check if already friend
    const res = await fetch('http://localhost:5050/api/friends/friends', {
        headers: { Authorization: `Bearer ${token}` }
    });

    const friends = await res.json()
    const isFriend = friends.some(friend => friend._id === user._id)
    profileCard.innerHTML = `
        <img src="http://localhost:5050${user.profileImage || "/Images/user.jpeg"}" alt="not found" style="width: 40px; height: 40px; border-radius: 50%; margin-right: 10px;">
        <h4>${user.username}</h4>
        <p>${user.email}</p>
        <button onclick="${isFriend ? `startChat('${user._id}', '${user.username}')` : `sendRequest('${user._id}')`}">
            ${isFriend ? 'Chat Now' : 'Send Friend Request'}
        </button>
    `;
}

function sendRequest(id) {
    fetch(`http://localhost:5050/api/friends/request/${id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
    })
        .then(res => res.json())
        .then(data => alert(data.message))
        .catch(err => console.error('Request error:', err));
}

function startChat(id, username) {
    const dummyFriend = { _id: id, username };
    selectFriend(dummyFriend);
}