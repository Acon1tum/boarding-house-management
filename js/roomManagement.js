import { supabase } from "../db/supabase.js";

const roomsPerPage = 5; // Number of rooms per page
let currentPage = 1;
let totalPages = 1;
let sortBy = "room_number"; // Default sorting

// Convert Image to Base64
async function convertToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result); // Base64 string
        reader.onerror = (error) => reject(error);
    });
}

// Fetch Rooms with Pagination & Sorting
async function fetchRooms() {
    const minPrice = document.getElementById("minPrice").value || 0;
    const maxPrice = document.getElementById("maxPrice").value || 99999;
    const status = document.getElementById("statusFilter").value;

    let query = supabase
        .from("rooms")
        .select("*", { count: "exact" })
        .gte("price", minPrice)
        .lte("price", maxPrice)
        .order(sortBy, { ascending: true });

    if (status !== "all") {
        query = query.eq("status", status);
    }

    // Pagination
    const from = (currentPage - 1) * roomsPerPage;
    const to = from + roomsPerPage - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) {
        console.error("Error fetching rooms:", error);
        return;
    }

    totalPages = Math.ceil(count / roomsPerPage);
    updatePagination();

    const roomList = document.getElementById("roomList");
    roomList.innerHTML = data
        .map((room) => {
            const statusClass = room.status === "available" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600";
            const imageSrc = room.image_base64 ? room.image_base64 : "default-room.jpg"; // Default if no image
            return `
                <tr class="border-b">
                    <td class="p-2">${room.room_number}</td>
                    <td class="p-2"><img src="${imageSrc}" class="w-16 h-16 object-cover rounded"></td>
                    <td class="p-2">${room.bedrooms}</td>
                    <td class="p-2">${room.capacity}</td>
                    <td class="p-2 ${statusClass}">${room.status}</td>
                    <td class="p-2">₱${room.price}</td>
                    <td class="p-2">
                        <button onclick="editRoom('${room.id}')" class="bg-blue-500 text-white px-2 py-1 rounded">Edit</button>
                        <button onclick="deleteRoom('${room.id}')" class="bg-red-500 text-white px-2 py-1 rounded">Delete</button>
                    </td>
                </tr>
            `;
        })
        .join("");
}

// Update Pagination UI
function updatePagination() {
    document.getElementById("currentPage").textContent = currentPage;
    document.getElementById("totalPages").textContent = totalPages;

    document.getElementById("prevPage").disabled = currentPage === 1;
    document.getElementById("nextPage").disabled = currentPage === totalPages;
}

// Next Page
document.getElementById("nextPage").addEventListener("click", () => {
    if (currentPage < totalPages) {
        currentPage++;
        fetchRooms();
    }
});

// Previous Page
document.getElementById("prevPage").addEventListener("click", () => {
    if (currentPage > 1) {
        currentPage--;
        fetchRooms();
    }
});

// Sorting
document.getElementById("sortBy").addEventListener("change", (event) => {
    sortBy = event.target.value;
    fetchRooms();
});

// Open Create Room Modal
document.getElementById("createRoomBtn").addEventListener("click", () => {
    document.getElementById("modalTitle").textContent = "Add New Room";
    document.getElementById("roomId").value = "";
    document.getElementById("roomNumber").value = "";
    document.getElementById("roomPrice").value = "";
    document.getElementById("bedrooms").value = "";
    document.getElementById("capacity").value = "";
    document.getElementById("roomStatus").value = "available";
    document.getElementById("roomImage").value = "";
    document.getElementById("roomModal").classList.remove("hidden");
});

// Open Edit Room Modal
window.editRoom = async function (id) {
    const { data, error } = await supabase.from("rooms").select("*").eq("id", id).single();
    if (error || !data) {
        alert("Failed to load room details!");
        return;
    }

    document.getElementById("modalTitle").textContent = "Edit Room";
    document.getElementById("roomId").value = data.id;
    document.getElementById("roomNumber").value = data.room_number;
    document.getElementById("roomPrice").value = data.price;
    document.getElementById("bedrooms").value = data.bedrooms;
    document.getElementById("capacity").value = data.capacity;
    document.getElementById("roomStatus").value = data.status;
    document.getElementById("roomModal").classList.remove("hidden");
};

// Close Modal
document.getElementById("cancelModalBtn").addEventListener("click", () => {
    document.getElementById("roomModal").classList.add("hidden");
});

// Save Room (Add or Edit)
document.getElementById("saveRoomBtn").addEventListener("click", async () => {
    const id = document.getElementById("roomId").value;
    const roomNumber = document.getElementById("roomNumber").value.trim();
    const price = document.getElementById("roomPrice").value.trim();
    const bedrooms = document.getElementById("bedrooms").value.trim();
    const capacity = document.getElementById("capacity").value.trim();
    const status = document.getElementById("roomStatus").value;
    const imageFile = document.getElementById("roomImage").files[0];

    if (!roomNumber || !price || !bedrooms || !capacity) {
        alert("All fields are required!");
        return;
    }

    let imageBase64 = null;
    if (imageFile) {
        imageBase64 = await convertToBase64(imageFile);
    }

    let query;
    if (id) {
        query = supabase.from("rooms").update({ 
            room_number: roomNumber, 
            price, 
            bedrooms, 
            capacity, 
            status, 
            image_base64: imageBase64 || undefined 
        }).eq("id", id);
    } else {
        query = supabase.from("rooms").insert([{
            room_number: roomNumber,
            price,
            bedrooms,
            capacity,
            status,
            image_base64: imageBase64
        }]);
    }

    const { error } = await query;
    if (error) {
        alert("Failed to save room: " + error.message);
    } else {
        alert("Room saved successfully!");
        document.getElementById("roomModal").classList.add("hidden");
        fetchRooms();
    }
});

// Delete Room
window.deleteRoom = async function (id) {
    if (!confirm("Are you sure you want to delete this room?")) return;

    const { error } = await supabase.from("rooms").delete().eq("id", id);
    if (error) {
        alert("Failed to delete room: " + error.message);
    } else {
        fetchRooms();
    }
};

// Reset Filters
document.getElementById("resetFilterBtn").addEventListener("click", () => {
    document.getElementById("minPrice").value = "";
    document.getElementById("maxPrice").value = "";
    document.getElementById("statusFilter").value = "all";
    currentPage = 1;
    fetchRooms();
});

// Initialize
document.getElementById("filterBtn").addEventListener("click", () => {
    currentPage = 1;
    fetchRooms();
});
document.addEventListener("DOMContentLoaded", fetchRooms);
