import { supabase } from "../db/supabase.js";

// Pagination state
let currentPage = 1;
const usersPerPage = 10;
let totalUsers = 0;
let allUsers = [];

// Ensure admin is logged in
const user = JSON.parse(localStorage.getItem("user"));
if (!user || user.role !== "admin") {
    window.location.href = "login.html"; // Redirect non-admins
}

// Fetch and display users
async function fetchUsers() {
    const { data, error } = await supabase.from("users").select("id, first_name, last_name, email, role, password");

    if (error) {
        console.error("Error fetching users:", error);
        return;
    }

    allUsers = data;
    totalUsers = data.length;
    displayCurrentPage();
}

function displayCurrentPage() {
    const startIndex = (currentPage - 1) * usersPerPage;
    const endIndex = Math.min(startIndex + usersPerPage, totalUsers);
    const currentUsers = allUsers.slice(startIndex, endIndex);

    // Update pagination info
    document.getElementById("startIndex").textContent = startIndex + 1;
    document.getElementById("endIndex").textContent = endIndex;
    document.getElementById("totalUsers").textContent = totalUsers;
    document.getElementById("currentPage").textContent = `Page ${currentPage}`;

    // Update button states
    document.getElementById("prevPageBtn").disabled = currentPage === 1;
    document.getElementById("nextPageBtn").disabled = endIndex >= totalUsers;

    // Update table
    const userTable = document.getElementById("userTable");
    userTable.innerHTML = "";

    currentUsers.forEach(user => {
        userTable.innerHTML += `
            <tr class="border">
                <td class="p-2">${user.first_name} ${user.last_name}</td>
                <td class="p-2">${user.email}</td>
                <td class="p-2">${user.role}</td>
                <td class="p-2">
                    <button class="bg-yellow-500 text-white px-2 py-1 rounded editUserBtn" data-id="${user.id}">✏️ Edit</button>
                    <button class="bg-red-500 text-white px-2 py-1 rounded deleteUserBtn" data-id="${user.id}">🗑️ Delete</button>
                </td>
            </tr>
        `;
    });

    // Reattach event listeners
    document.querySelectorAll(".editUserBtn").forEach(btn => {
        btn.addEventListener("click", () => openEditUser(btn.dataset.id));
    });

    document.querySelectorAll(".deleteUserBtn").forEach(btn => {
        btn.addEventListener("click", () => deleteUser(btn.dataset.id));
    });
}

// Pagination event listeners
document.getElementById("prevPageBtn").addEventListener("click", () => {
    if (currentPage > 1) {
        currentPage--;
        displayCurrentPage();
    }
});

document.getElementById("nextPageBtn").addEventListener("click", () => {
    const maxPage = Math.ceil(totalUsers / usersPerPage);
    if (currentPage < maxPage) {
        currentPage++;
        displayCurrentPage();
    }
});

// Open Add User Modal
document.getElementById("addUserBtn").addEventListener("click", () => {
    document.getElementById("modalTitle").textContent = "Add User";
    document.getElementById("userId").value = "";
    document.getElementById("firstName").value = "";
    document.getElementById("lastName").value = "";
    document.getElementById("email").value = "";
    document.getElementById("role").value = "tenant";
    document.getElementById("password").value = "";
    document.getElementById("userModal").classList.remove("hidden");
});

// Open Edit User Modal
async function openEditUser(userId) {
    const { data, error } = await supabase.from("users").select("*").eq("id", userId).single();

    if (error || !data) {
        alert("Error fetching user details!");
        return;
    }

    document.getElementById("modalTitle").textContent = "Edit User";
    document.getElementById("userId").value = data.id;
    document.getElementById("firstName").value = data.first_name;
    document.getElementById("lastName").value = data.last_name;
    document.getElementById("email").value = data.email;
    document.getElementById("role").value = data.role;
    document.getElementById("password").value = ""; // Password field remains empty
    document.getElementById("userModal").classList.remove("hidden");
}

// Close Modal
document.getElementById("closeModalBtn").addEventListener("click", () => {
    document.getElementById("userModal").classList.add("hidden");
});

// Handle User Form Submission
document.getElementById("userForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const userId = document.getElementById("userId").value;
    const firstName = document.getElementById("firstName").value.trim();
    const lastName = document.getElementById("lastName").value.trim();
    const email = document.getElementById("email").value.trim();
    const role = document.getElementById("role").value;
    const password = document.getElementById("password").value.trim(); // Password input field

    if (!firstName || !lastName || !email) {
        alert("First Name, Last Name, and Email are required!");
        return;
    }

    if (userId) {
        // Get existing user data
        const { data: existingUser, error: fetchError } = await supabase.from("users").select("password").eq("id", userId).single();
        if (fetchError) {
            alert("Failed to fetch existing user data.");
            return;
        }

        // Keep the existing password if none is provided
        const updatedData = {
            first_name: firstName,
            last_name: lastName,
            email,
            role,
            password: password ? password : existingUser.password // Use new password only if provided
        };

        // Update existing user
        const { error } = await supabase.from("users").update(updatedData).eq("id", userId);

        if (error) {
            alert("Failed to update user: " + error.message);
            return;
        }
    } else {
        // Insert new user into "users" table
        const { error } = await supabase.from("users").insert([
            {
                first_name: firstName,
                last_name: lastName,
                email,
                role,
                password // Storing plaintext password (for now)
            }
        ]);

        if (error) {
            alert("Failed to add user: " + error.message);
            return;
        }
    }

    document.getElementById("userModal").classList.add("hidden");
    fetchUsers();
});

// Delete User
async function deleteUser(userId) {
    if (!confirm("Are you sure you want to delete this user?")) return;

    // Remove user from database
    const { error } = await supabase.from("users").delete().eq("id", userId);
    if (error) {
        alert("Failed to delete user: " + error.message);
        return;
    }

    fetchUsers();
}

// Attach Logout Event Listener After Navbar Loads
fetch("navbar.html")
    .then(response => response.text())
    .then(data => {
        document.getElementById("navbar").innerHTML = data;

        document.getElementById("logoutBtn")?.addEventListener("click", () => {
            localStorage.removeItem("user"); // Clear session
            supabase.auth.signOut(); // Logout from Supabase
            window.location.href = "login.html"; // Redirect to login
        });
    })
    .catch(error => console.error("Error loading navbar:", error));

// Load Users on Page Load
document.addEventListener("DOMContentLoaded", fetchUsers);
