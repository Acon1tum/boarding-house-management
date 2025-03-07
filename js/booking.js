import { supabase } from "../db/supabase.js";

// Ensure that only tenants can access the booking page
document.addEventListener("DOMContentLoaded", () => {
    const user = JSON.parse(localStorage.getItem("user"));
    
    if (!user) {
        console.warn("No user found, redirecting to login.");
        window.location.href = "login.html";  // Redirect if no user is logged in
        return;
    }

    if (user.role !== "tenant") {
        console.warn("Non-tenant user trying to access tenant page, redirecting.");
        // Redirect non-tenants to their appropriate page
        switch (user.role) {
            case "admin":
                window.location.href = "admin.html";
                break;
            case "landlord":
                window.location.href = "landlordDashboard.html";
                break;
            default:
                window.location.href = "login.html";
        }
        return;
    }

    console.log("User authenticated as tenant:", user);
    fetchRooms();  // Proceed to fetch rooms for the tenant.
});

// Fetch Available Rooms
async function fetchRooms() {
    const minPrice = document.getElementById("minPrice")?.value || 0;
    const maxPrice = document.getElementById("maxPrice")?.value || 9999;

    let query = supabase
        .from("rooms")
        .select("*")
        .gte("price", minPrice)
        .lte("price", maxPrice)
        .eq("status", "available"); // Only fetch available rooms

    const { data, error } = await query;
    if (error) {
        console.error("Error fetching rooms:", error);
        return;
    }

    console.log("Fetched available rooms:", data); // Debugging log

    const roomList = document.getElementById("roomList");
    const noRoomsMessage = document.getElementById("noRooms");

    if (!roomList || !noRoomsMessage) {
        console.error("Missing 'roomList' or 'noRooms' element in HTML.");
        return;
    }

    roomList.innerHTML = "";

    if (data.length === 0) {
        noRoomsMessage.classList.remove("hidden");
    } else {
        noRoomsMessage.classList.add("hidden");
    }

    data.forEach(room => {
        roomList.innerHTML += `
            <div class="p-4 border rounded-lg bg-white shadow-lg">
                <p class="text-lg font-bold">Room ${room.room_number}</p>
                <p class="text-gray-600">Price: ₱${room.price}/month</p>
                <button class="bg-green-500 text-white px-4 py-2 mt-2 rounded book-btn hover:bg-green-600 transition"
                    data-room-id="${room.id}" data-room-number="${room.room_number}">
                    Book Now
                </button>
            </div>
        `;
    });

    // Attach event listeners to each "Book Now" button
    document.querySelectorAll(".book-btn").forEach(button => {
        button.addEventListener("click", async (e) => {
            const user = JSON.parse(localStorage.getItem("user"));
            if (!user) {
                alert("Please log in to book a room.");
                return;
            }

            // Check if the tenant already has an approved booking
            const { data: existingBooking, error } = await supabase
                .from("bookings")
                .select("id")
                .eq("tenant_id", user.id)
                .eq("status", "approved")
                .maybeSingle();

            if (error) {
                console.error("Error checking existing booking:", error);
                alert("Error checking existing bookings. Please try again.");
                return;
            }

            if (existingBooking) {
                alert("You already have an approved booking and cannot book another room.");
                return;
            }

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

    // Double-check the tenant does not already have an approved booking
    const { data: existingBooking, error: bookingError } = await supabase
        .from("bookings")
        .select("id")
        .eq("tenant_id", user.id)
        .eq("status", "approved")
        .maybeSingle();

    if (bookingError) {
        alert("Error checking existing bookings. Please try again.");
        return;
    }

    if (existingBooking) {
        alert("You already have an approved booking and cannot book another room.");
        document.getElementById("bookingModal").classList.add("hidden");
        return;
    }

    // Verify room is still available before booking
    const { data: roomData, error: roomError } = await supabase
        .from("rooms")
        .select("status")
        .eq("id", roomId)
        .single();

    if (roomError) {
        alert("Error checking room status: " + roomError.message);
        return;
    }

    if (roomData.status !== "available") {
        alert("This room is no longer available.");
        document.getElementById("bookingModal").classList.add("hidden");
        fetchRooms(); // Refresh the room list
        return;
    }

    // Insert new booking request
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
