// SignIn Validation
document.getElementById('signinForm').addEventListener("submit", async (e) => {
	e.preventDefault();

	const usernameEmail = document.getElementById('usernameEmail').value.trim();
	const pass = document.getElementById('pass').value.trim();
	const alertBox = document.getElementById("alertBox")

	try {
		const res = await fetch('https://chat-app-backend-vf79.onrender.com/api/auth/login', {
			method: "POST",
			headers: {
				"Content-type": "application/json"
			},
			body: JSON.stringify({
				loginid: usernameEmail,
				password: pass
			})
		})

		const data = await res.json()

		if (!res.ok) {
			alertBox.className = "alert alert-danger"
			alertBox.textContent = data.message || "login failed!!!"
			alertBox.classList.remove('d-none')
			return
		}

		// saving the token and redirecting..
		sessionStorage.setItem('token', data.token)
		window.location.href = './Pages/dashboard.html'
	} catch (err) {
		alertBox.className = 'alert alert-danger'
		alertBox.textContent = err
		alertBox.classList.remove('d-none')
	}
})
document.getElementById('signupForm').addEventListener("submit", async (e) => {
	e.preventDefault();

	const username = document.getElementById("username").value.trim()
	const email = document.getElementById("email").value.trim()
	const password = document.getElementById("password").value.trim()
	const alertBox = document.getElementById("alertBox")

	// Custom Password Validation
	const Validpassword = passwordValidation(password)
	if (!Validpassword) {
		alertBox.className = "alert alert-danger"
		alertBox.textContent = "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
		alertBox.classList.remove("d-none")
		return;
	}

	try {
		const response = await fetch("https://chat-app-backend-vf79.onrender.com/api/auth/register", {
			method: "POST",
			headers: {
				"Content-type": "application/json"
			},
			body: JSON.stringify({ username, email, password })
		})
		const data = await response.json()

		if (response.ok) {
			alertBox.className = "alert alert-success"
			alertBox.textContent = "Account Created! Redirected to login..."
			alertBox.classList.remove("d-none")

			setTimeout(() => {
				window.location.href = "index.html"
			}, 2000)
		} else {
			alertBox.classname = "alert alert-danger"
			alertBox.textContent = data.message || "singup failed!!! try again later..."
			alertBox.classList.remove("d-none")
		}
	} catch (err) {
		alertBox.className = 'alert alert-danger'
		alertBox.textContent = 'something went wrong!!!' || `${err}`
		alertBox.classList.remove('d-none')
	}

})

function passwordValidation(password) {
	const minlength = 8
	const hasUpper = /[A-Z]/.test(password)
	const hasLower = /[a-z]/.test(password)
	const hasNum = /[0-9]/.test(password)
	const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password)
	return password.length >= minlength && hasUpper && hasLower && hasNum && hasSpecial;
}

const signUpButton = document.getElementById('signUp');
const signInButton = document.getElementById('signIn');
const container = document.getElementById('container');

signUpButton.addEventListener('click', () => {
	container.classList.add("right-panel-active");
});

signInButton.addEventListener('click', () => {
	container.classList.remove("right-panel-active");
});