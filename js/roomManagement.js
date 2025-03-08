import { supabase } from "../db/supabase.js";

// Fetch Rooms
async function fetchRooms() {
    const minPrice = document.getElementById("minPrice").value || 0;
    const maxPrice = document.getElementById("maxPrice").value || 9999;
    const status = document.getElementById("statusFilter").value;

    let query = supabase.from("rooms").select("*").gte("price", minPrice).lte("price", maxPrice);
    if (status !== "all") {
        query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) {
        console.error("Error fetching rooms:", error);
        return;
    }

    const roomList = document.getElementById("roomList");

    // Update the room table with the room data
    roomList.innerHTML = data.map(room => {
        // Conditional class for status color
        const statusClass = room.status === "available" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600";

        return `
            <tr class="border-b">
                <td class="p-2">${room.room_number}</td>
                <td class="p-2 ${statusClass}">${room.status}</td>
                <td class="p-2">₱${room.price}</td>
                <td class="p-2">
                    <button onclick="editRoom('${room.id}')" class="bg-blue-500 text-white px-2 py-1 rounded">Edit</button>
                    <button onclick="deleteRoom('${room.id}')" class="bg-red-500 text-white px-2 py-1 rounded">Delete</button>
                </td>
            </tr>
        `;
    }).join("");  // Join all the rows together and inject into the table body
}


// Open Create Room Modal
document.getElementById("createRoomBtn").addEventListener("click", () => {
    document.getElementById("modalTitle").textContent = "Add New Room";
    document.getElementById("roomId").value = "";
    document.getElementById("roomNumber").value = "";
    document.getElementById("roomPrice").value = "";
    document.getElementById("roomStatus").value = "available";
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
    const status = document.getElementById("roomStatus").value;

    if (!roomNumber || !price) {
        alert("All fields are required!");
        return;
    }

    let query;
    if (id) {
        query = supabase.from("rooms").update({ room_number: roomNumber, price, status }).eq("id", id);
    } else {
        query = supabase.from("rooms").insert([{ room_number: roomNumber, price, status }]);
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
    fetchRooms();
});

// Initialize
document.getElementById("filterBtn").addEventListener("click", fetchRooms);
document.addEventListener("DOMContentLoaded", fetchRooms);
