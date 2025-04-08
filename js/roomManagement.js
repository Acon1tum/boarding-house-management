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

// Fetch Rooms with Pagination, Sorting, and Occupancy Data
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

    const { data: rooms, count, error } = await query;

    if (error) {
        console.error("Error fetching rooms:", error);
        return;
    }

    // Get current occupancy for each room
    const { data: occupancyData, error: occupancyError } = await supabase
        .from("room_tenants")
        .select("room_id")
        .is("end_date", null);

    if (occupancyError) {
        console.error("Error fetching occupancy data:", occupancyError);
        return;
    }

    // Create a map of room_id to occupant count
    const occupancyMap = {};
    occupancyData.forEach(item => {
        occupancyMap[item.room_id] = (occupancyMap[item.room_id] || 0) + 1;
    });

    totalPages = Math.ceil(count / roomsPerPage);
    updatePagination();

    const roomList = document.getElementById("roomList");
    roomList.innerHTML = rooms
        .map((room) => {
            const currentOccupants = occupancyMap[room.id] || 0;
            const isFull = currentOccupants >= room.capacity;
            
            // Determine status class and text
            let statusClass, statusText;
            if (isFull) {
                statusClass = "bg-red-100 text-red-600";
                statusText = `Full (${currentOccupants}/${room.capacity})`;
            } else if (currentOccupants > 0) {
                statusClass = "bg-yellow-100 text-yellow-600";
                statusText = `Occupied (${currentOccupants}/${room.capacity})`;
            } else {
                statusClass = "bg-green-100 text-green-600";
                statusText = `Available (0/${room.capacity})`;
            }

            const imageSrc = room.image_base64 ? room.image_base64 : "default-room.jpg";

            return `
                <tr class="border-b">
                    <td class="p-2">${room.room_number}</td>
                    <td class="p-2"><img src="${imageSrc}" class="w-16 h-16 object-cover rounded"></td>
                    <td class="p-2">${room.bedrooms}</td>
                    <td class="p-2">${room.capacity}</td>
                    <td class="p-2 ${statusClass}">${statusText}</td>
                    <td class="p-2">₱${room.price}</td>
                    <td class="p-2">
                        <button onclick="editRoom('${room.id}')" class="bg-blue-500 text-white px-2 py-1 rounded">Edit</button>
                        <button onclick="deleteRoom('${room.id}')" class="bg-red-500 text-white px-2 py-1 rounded">Delete</button>
                        <button onclick="viewOccupants('${room.id}')" class="bg-purple-500 text-white px-2 py-1 rounded">View Tenants</button>
                    </td>
                </tr>
            `;
        })
        .join("");
}

// View Occupants Modal
window.viewOccupants = async function(roomId) {
    const { data: tenants, error } = await supabase
        .from("room_tenants")
        .select("id, start_date, users(first_name, last_name, email)")
        .eq("room_id", roomId)
        .is("end_date", null);

    if (error) {
        console.error("Error fetching occupants:", error);
        alert("Failed to load room occupants");
        return;
    }

    // Get room details
    const { data: room, error: roomError } = await supabase
        .from("rooms")
        .select("room_number, capacity")
        .eq("id", roomId)
        .single();

    if (roomError) {
        console.error("Error fetching room details:", roomError);
        return;
    }

    // Build modal content
    let occupantsHTML = `
        <h3 class="text-xl font-bold mb-4">Room ${room.room_number} Occupants</h3>
        <p class="mb-4">Capacity: ${tenants.length}/${room.capacity}</p>
        <div class="max-h-64 overflow-y-auto">
    `;

    if (tenants.length === 0) {
        occupantsHTML += `<p class="text-gray-500">No current occupants</p>`;
    } else {
        occupantsHTML += `
            <table class="w-full border-collapse">
                <thead>
                    <tr class="bg-gray-100">
                        <th class="p-2 text-left">Name</th>
                        <th class="p-2 text-left">Email</th>
                        <th class="p-2 text-left">Since</th>
                    </tr>
                </thead>
                <tbody>
        `;

        tenants.forEach(tenant => {
            occupantsHTML += `
                <tr class="border-b">
                    <td class="p-2">${tenant.users.first_name} ${tenant.users.last_name}</td>
                    <td class="p-2">${tenant.users.email}</td>
                    <td class="p-2">${new Date(tenant.start_date).toLocaleDateString()}</td>
                </tr>
            `;
        });

        occupantsHTML += `</tbody></table>`;
    }

    occupantsHTML += `</div>`;

    // Create and show modal
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center';
    modal.innerHTML = `
        <div class="bg-white p-6 rounded-lg shadow-lg w-96">
            ${occupantsHTML}
            <div class="mt-4 flex justify-end">
                <button onclick="this.closest('div').remove()" class="bg-gray-500 text-white px-4 py-2 rounded">
                    Close
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
};

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
    if (!confirm("Are you sure you want to delete this room? This will also remove all tenant associations.")) return;

    // First check if there are active tenants
    const { count: activeTenants, error: countError } = await supabase
        .from("room_tenants")
        .select("*", { count: 'exact' })
        .eq("room_id", id)
        .is("end_date", null);

    if (countError) {
        alert("Error checking room occupancy: " + countError.message);
        return;
    }

    if (activeTenants > 0) {
        alert("Cannot delete room with active tenants. Please remove tenants first.");
        return;
    }

    // Delete the room
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