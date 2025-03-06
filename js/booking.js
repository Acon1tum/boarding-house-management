// js/booking.js
import { supabase } from "../db/supabase.js";

// Fetch Available Rooms with Filters
async function fetchRooms() {
    const minPrice = document.getElementById("minPrice")?.value || 0;
    const maxPrice = document.getElementById("maxPrice")?.value || 9999;
    const status = document.getElementById("statusFilter")?.value || "available";

    let query = supabase
        .from("rooms")
        .select("*")
        .gte("price", minPrice)
        .lte("price", maxPrice);

    if (status !== "all") {
        query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) {
        console.error("Error fetching rooms:", error);
        return;
    }

    const roomList = document.getElementById("roomList");
    roomList.innerHTML = "";

    data.forEach(room => {
        roomList.innerHTML += `
            <div class="p-4 border rounded-lg bg-white shadow-lg">
                <p class="text-lg font-bold">Room ${room.room_number}</p>
                <p class="text-gray-600">Price: $${room.price}/month</p>
                <p class="text-gray-500">Status: ${room.status}</p>
                <button class="bg-green-500 text-white px-4 py-2 mt-2 rounded book-btn"
                    data-room-id="${room.id}" data-room-number="${room.room_number}">
                    Book Now
                </button>
            </div>
        `;
    });

    // Attach event listeners to each "Book Now" button
    document.querySelectorAll(".book-btn").forEach(button => {
        button.addEventListener("click", (e) => {
            const roomId = e.target.dataset.roomId;
            const roomNumber = e.target.dataset.roomNumber;
            openBookingModal(roomId, roomNumber);
        });
    });
}

// Open Booking Confirmation Modal
function openBookingModal(roomId, roomNumber) {
    document.getElementById("modalRoomNumber").textContent = `Room ${roomNumber}`;
    document.getElementById("confirmBookingBtn").setAttribute("data-room-id", roomId);
    document.getElementById("bookingModal").classList.remove("hidden");
}

// Close Modal
document.getElementById("closeModalBtn").addEventListener("click", () => {
    document.getElementById("bookingModal").classList.add("hidden");
});

// Confirm Booking
document.getElementById("confirmBookingBtn").addEventListener("click", async function () {
    const roomId = this.getAttribute("data-room-id");
    bookRoom(roomId);
});

// Book a Room
async function bookRoom(roomId) {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) {
        alert("Please log in to book a room.");
        return;
    }

    if (user.role === "tenant") {
        // Check if the tenant already has a booked room
        const { data: existingBooking } = await supabase
            .from("bookings")
            .select("*")
            .eq("tenant_id", user.id)
            .in("status", ["pending", "approved"]);

        if (existingBooking?.length > 0) {
            alert("You can only book one room at a time.");
            return;
        }
    }

    // Insert new booking
    const { error } = await supabase
        .from("bookings")
        .insert([{ tenant_id: user.id, room_id: roomId, start_date: new Date(), status: "pending" }]);

    if (error) {
        alert("Booking failed: " + error.message);
    } else {
        alert("Booking request sent!");
        document.getElementById("bookingModal").classList.add("hidden");
        fetchRooms();
    }
}

// Apply filters on form submit
document.getElementById("filterForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    fetchRooms();
});

// Initialize
document.addEventListener("DOMContentLoaded", fetchRooms);
