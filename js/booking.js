import { supabase } from "../db/supabase.js";

// Ensure that only tenants can access the booking page
document.addEventListener("DOMContentLoaded", () => {
    const user = JSON.parse(localStorage.getItem("user"));
    
    if (!user) {
        console.warn("No user found, redirecting to login.");
        window.location.href = "login.html";  
        return;
    }

    if (user.role !== "tenant") {
        console.warn("Non-tenant user trying to access tenant page, redirecting.");
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
    fetchRooms(); 
    fetchPendingBooking();
});

// Fetch Available Rooms with Images, Bedrooms & Capacity
async function fetchRooms() {
    const minPrice = document.getElementById("minPrice")?.value || 0;
    const maxPrice = document.getElementById("maxPrice")?.value || 9999;
    const minBedrooms = document.getElementById("minBedrooms")?.value || 1;
    const minCapacity = document.getElementById("minCapacity")?.value || 1;

    let query = supabase
        .from("rooms")
        .select("*")
        .gte("price", minPrice)
        .lte("price", maxPrice)
        .gte("bedrooms", minBedrooms)
        .gte("capacity", minCapacity);

    const { data, error } = await query;
    if (error) {
        console.error("Error fetching rooms:", error);
        return;
    }

    console.log("Fetched available rooms:", data); 

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

    // Get current occupancy for each room
    const { data: occupancyData, error: occupancyError } = await supabase
        .from("room_tenants")
        .select("room_id")
        .is("end_date", null);

    const occupancyMap = {};
    if (!occupancyError) {
        occupancyData.forEach(item => {
            occupancyMap[item.room_id] = (occupancyMap[item.room_id] || 0) + 1;
        });
    }

    data.forEach(room => {
        const currentOccupants = occupancyMap[room.id] || 0;
        const isAvailable = currentOccupants < room.capacity;
        const imageSrc = room.image_base64 ? room.image_base64 : "default-room.jpg";

        roomList.innerHTML += `
            <div class="p-4 border rounded-lg bg-white shadow-lg">
                <img src="${imageSrc}" alt="Room Image" class="w-full h-48 object-cover rounded">
                <p class="text-lg font-bold">Room ${room.room_number}</p>
                <p class="text-gray-600">Price: <span class="font-semibold">${room.price.toFixed(2)}</span> PHP/month</p>
                <p class="text-gray-600">Bedrooms: ${room.bedrooms}</p>
                <p class="text-gray-600">Capacity: ${room.capacity} people</p>
                <p class="text-gray-600">Current Occupants: ${currentOccupants}</p>
                <button class="bg-green-500 text-white px-4 py-2 mt-2 rounded book-btn hover:bg-green-600 transition ${!isAvailable ? 'opacity-50 cursor-not-allowed' : ''}"
                    data-room-id="${room.id}" 
                    data-room-number="${room.room_number}"
                    data-room-image="${imageSrc}"
                    ${!isAvailable ? 'disabled' : ''}>
                    ${isAvailable ? 'Book Now' : 'Room Full'}
                </button>
            </div>
        `;
    });

    // Attach event listeners to each "Book Now" button
    document.querySelectorAll(".book-btn:not([disabled])").forEach(button => {
        button.addEventListener("click", async (e) => {
            const user = JSON.parse(localStorage.getItem("user"));
            if (!user) {
                alert("Please log in to book a room.");
                return;
            }

            const roomId = e.target.dataset.roomId;
            const roomNumber = e.target.dataset.roomNumber;
            const roomImage = e.target.dataset.roomImage;

            try {
                // Check if the tenant already has an active booking for this room
                const { data: existingTenancy, error: tenancyError } = await supabase
                    .from("room_tenants")
                    .select("*")
                    .eq("tenant_id", user.id)
                    .eq("room_id", roomId)
                    .is("end_date", null)
                    .maybeSingle();

                if (tenancyError) {
                    throw new Error("Error checking existing tenancy");
                }

                if (existingTenancy) {
                    alert("You already have an active booking for this room.");
                    return;
                }

                // Check room capacity
                const { data: room, error: roomError } = await supabase
                    .from("rooms")
                    .select("capacity")
                    .eq("id", roomId)
                    .single();

                if (roomError) {
                    throw new Error("Error checking room capacity");
                }

                // Get current number of tenants in the room
                const { count: currentOccupants, error: countError } = await supabase
                    .from("room_tenants")
                    .select("*", { count: 'exact' })
                    .eq("room_id", roomId)
                    .is("end_date", null);

                if (countError) {
                    throw new Error("Error checking room occupancy");
                }

                if (currentOccupants >= room.capacity) {
                    alert("This room has reached maximum capacity.");
                    fetchRooms(); // Refresh the room list
                    return;
                }

                openBookingModal(roomId, roomNumber, roomImage);
            } catch (error) {
                console.error("Booking error:", error);
                alert("Error processing booking. Please try again.");
            }
        });
    });
}

// Open Booking Confirmation Modal with Image
function openBookingModal(roomId, roomNumber, roomImage) {
    document.getElementById("modalRoomNumber").textContent = `Room ${roomNumber}`;

    const modalImage = document.getElementById("modalRoomImage");
    if (roomImage) {
        modalImage.src = roomImage;
        modalImage.classList.remove("hidden");
    } else {
        modalImage.classList.add("hidden");
    }

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
    await bookRoom(roomId);
});

// Book a Room
async function bookRoom(roomId) {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) {
        alert("Please log in to book a room.");
        return;
    }

    try {
        // Double-check the tenant does not already have an active booking for this room
        const { data: existingTenancy, error: tenancyError } = await supabase
            .from("room_tenants")
            .select("*")
            .eq("tenant_id", user.id)
            .eq("room_id", roomId)
            .is("end_date", null)
            .maybeSingle();

        if (tenancyError) {
            throw new Error("Error verifying tenancy");
        }

        if (existingTenancy) {
            alert("You already have an active booking for this room.");
            document.getElementById("bookingModal").classList.add("hidden");
            return;
        }

        // Check if there's already a pending booking request for this room
        const { data: existingRequest, error: requestError } = await supabase
            .from("booking_requests")
            .select("*")
            .eq("tenant_id", user.id)
            .eq("room_id", roomId)
            .eq("status", "pending")
            .maybeSingle();

        if (requestError) {
            throw new Error("Error checking existing requests");
        }

        if (existingRequest) {
            alert("You already have a pending booking request for this room.");
            document.getElementById("bookingModal").classList.add("hidden");
            return;
        }

        // Create a new booking request
        const { data: bookingRequest, error: createError } = await supabase
            .from("booking_requests")
            .insert([
                {
                    tenant_id: user.id,
                    room_id: roomId,
                    status: "pending",
                    request_date: new Date().toISOString()
                }
            ])
            .select()
            .single();

        if (createError) {
            throw new Error("Error creating booking request");
        }

        alert("Booking request submitted successfully! Please wait for landlord approval.");
        document.getElementById("bookingModal").classList.add("hidden");
        fetchPendingBooking(); // Refresh the pending bookings list

    } catch (error) {
        console.error("Booking request error:", error);
        alert("Error submitting booking request. Please try again.");
    }
}

// Apply filters on form submit
document.getElementById("filterForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    fetchRooms();
});

// Fetch and display pending booking requests
async function fetchPendingBooking() {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return;

    try {
        const { data: requests, error } = await supabase
            .from("booking_requests")
            .select(`
                id,
                request_date,
                status,
                rooms (
                    room_number
                )
            `)
            .eq("tenant_id", user.id)
            .order('request_date', { ascending: false });

        if (error) {
            throw new Error("Error fetching booking requests");
        }

        const pendingRequestsTable = document.getElementById("pendingRequestsTable");
        if (!pendingRequestsTable) return;

        if (!requests || requests.length === 0) {
            pendingRequestsTable.innerHTML = `
                <tr>
                    <td colspan="4" class="p-3 text-gray-600 text-center">No booking requests found.</td>
                </tr>
            `;
            return;
        }

        pendingRequestsTable.innerHTML = requests.map(request => {
            const roomNumber = request.rooms ? request.rooms.room_number : "N/A";
            let statusColorClass = "text-yellow-500";
            if (request.status === "approved") {
                statusColorClass = "text-green-500 font-semibold";
            } else if (request.status === "rejected") {
                statusColorClass = "text-red-500 font-semibold";
            }

            const cancelButton = request.status === "pending" 
                ? `<button onclick="cancelRequest('${request.id}')" 
                    class="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600">
                    Cancel Request
                </button>`
                : '';

            return `
                <tr class="border-b">
                    <td class="p-3">${roomNumber}</td>
                    <td class="p-3">${new Date(request.request_date).toLocaleDateString()}</td>
                    <td class="p-3 ${statusColorClass}">${request.status}</td>
                    <td class="p-3">${cancelButton}</td>
                </tr>
            `;
        }).join("");

    } catch (error) {
        console.error("Error fetching pending bookings:", error);
        const pendingRequestsTable = document.getElementById("pendingRequestsTable");
        if (pendingRequestsTable) {
            pendingRequestsTable.innerHTML = `
                <tr>
                    <td colspan="4" class="p-3 text-red-500 text-center">Error loading booking requests.</td>
                </tr>
            `;
        }
    }
}

// Cancel Booking Request
async function cancelRequest(requestId) {
    try {
        const { error } = await supabase
            .from("booking_requests")
            .delete()
            .eq("id", requestId);

        if (error) {
            throw new Error("Error canceling booking request");
        }

        alert("Booking request canceled successfully!");
        fetchPendingBooking(); // Refresh the list

    } catch (error) {
        console.error("Error canceling request:", error);
        alert("Error canceling booking request. Please try again.");
    }
}

// Make cancelRequest available globally
window.cancelRequest = cancelRequest;