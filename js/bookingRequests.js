import { supabase } from "../db/supabase.js";

// Default placeholder avatar (a simple gray circle with user icon)
const DEFAULT_AVATAR = `data:image/svg+xml;base64,${btoa(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10" fill="#e5e7eb"/>
    <path d="M12 8v4M8 12h8" stroke="#6b7280"/>
    <circle cx="12" cy="12" r="3" fill="#6b7280"/>
</svg>
`)}`;

// Fetch Booking Requests
async function fetchBookings() {
    try {
        // Fetch all booking requests with room and tenant details
        const { data: bookingRequests, error } = await supabase
            .from("booking_requests")
            .select(`
                id,
                request_date,
                status,
                tenant_id,
                room_id,
                rooms (
                    id,
                    room_number,
                    capacity
                )
            `)
            .order('request_date', { ascending: false });

        if (error) {
            console.error("Error fetching booking requests:", error);
            document.getElementById("bookingList").innerHTML = `<tr><td colspan="5" class="text-center p-4 text-red-500">Error loading booking requests.</td></tr>`;
            return;
        }

        if (!bookingRequests || bookingRequests.length === 0) {
            document.getElementById("bookingList").innerHTML = `<tr><td colspan="5" class="text-center p-4 text-gray-500">No booking requests found.</td></tr>`;
            return;
        }

        // Get tenant details for each request
        const tenantIds = bookingRequests.map(request => request.tenant_id);
        const { data: tenants, error: tenantsError } = await supabase
            .from("users")
            .select("id, first_name, last_name, email, phone, profile_picture")
            .in("id", tenantIds);

        if (tenantsError) {
            console.error("Error fetching tenant details:", tenantsError);
        }

        // Create a map of tenant details
        const tenantMap = {};
        if (tenants) {
            tenants.forEach(tenant => {
                tenantMap[tenant.id] = tenant;
            });
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

        const bookingList = document.getElementById("bookingList");
        bookingList.innerHTML = bookingRequests
            .map((request) => {
                const roomNumber = request.rooms ? request.rooms.room_number : "N/A";
                const tenant = tenantMap[request.tenant_id] || null;
                const tenantName = tenant ? `${tenant.first_name} ${tenant.last_name}` : "Unknown Tenant";
                const tenantEmail = tenant ? tenant.email : "";
                const profilePicture = tenant?.profile_picture || DEFAULT_AVATAR;
                const currentOccupants = occupancyMap[request.rooms?.id] || 0;
                const roomCapacity = request.rooms?.capacity || 0;
                const isRoomFull = currentOccupants >= roomCapacity;

                let statusColorClass = "text-yellow-500";
                if (request.status === "approved") {
                    statusColorClass = "text-green-500 font-semibold";
                } else if (request.status === "rejected") {
                    statusColorClass = "text-red-500 font-semibold";
                }

                const actionButtons = request.status === "pending" 
                    ? `
                        <button class="bg-green-500 text-white px-3 py-1 rounded mr-2 approve-btn ${isRoomFull ? 'opacity-50 cursor-not-allowed' : ''}"
                            data-id="${request.id}" 
                            data-room="${request.rooms?.id}"
                            ${isRoomFull ? 'disabled' : ''}>
                            ✅ Approve
                        </button>
                        <button class="bg-red-500 text-white px-3 py-1 rounded reject-btn"
                            data-id="${request.id}">
                            ❌ Reject
                        </button>
                    `
                    : '';

                return `
                    <tr class="border-b">
                        <td class="p-3">
                            <div class="flex items-center gap-3">
                                <div class="relative">
                                    <img src="${profilePicture}" 
                                        alt="Profile" 
                                        class="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                                        onerror="this.src='${DEFAULT_AVATAR}'">
                                </div>
                                <div>
                                    <div class="font-medium">${tenantName}</div>
                                    <div class="text-sm text-gray-500">${tenantEmail}</div>
                                </div>
                            </div>
                        </td>
                        <td class="p-3">Room ${roomNumber}</td>
                        <td class="p-3">${new Date(request.request_date).toLocaleDateString()}</td>
                        <td class="p-3 ${statusColorClass}">${request.status}</td>
                        <td class="p-3">${actionButtons}</td>
                    </tr>
                `;
            })
            .join("");

        // Attach event listeners
        document.querySelectorAll(".approve-btn").forEach(button => {
            button.addEventListener("click", (e) => {
                const requestId = e.target.getAttribute("data-id");
                const roomId = e.target.getAttribute("data-room");
                confirmAction(() => approveRequest(requestId, roomId), "approve this booking request?");
            });
        });

        document.querySelectorAll(".reject-btn").forEach(button => {
            button.addEventListener("click", (e) => {
                const requestId = e.target.getAttribute("data-id");
                confirmAction(() => rejectRequest(requestId), "reject this booking request?");
            });
        });
    } catch (error) {
        console.error("Error in fetchBookings:", error);
        document.getElementById("bookingList").innerHTML = `<tr><td colspan="5" class="text-center p-4 text-red-500">Error loading booking requests.</td></tr>`;
    }
}

// Confirm Action Before Executing
function confirmAction(action, message) {
    document.getElementById("confirmMessage").textContent = `Are you sure you want to ${message}`;
    document.getElementById("confirmModal").classList.remove("hidden");

    document.getElementById("confirmYes").onclick = () => {
        action();
        closeModal();
    };
}

// Close Modal
function closeModal() {
    document.getElementById("confirmModal").classList.add("hidden");
}

// Approve Booking Request
async function approveRequest(requestId, roomId) {
    try {
        // Start a transaction
        const { data: request, error: requestError } = await supabase
            .from("booking_requests")
            .select("*")
            .eq("id", requestId)
            .single();

        if (requestError || !request) {
            throw new Error("Error fetching booking request");
        }

        // Check room capacity
        const { data: room, error: roomError } = await supabase
            .from("rooms")
            .select("capacity")
            .eq("id", roomId)
            .single();

        if (roomError || !room) {
            throw new Error("Error checking room capacity");
        }

        // Get current occupancy
        const { count: currentOccupants, error: countError } = await supabase
            .from("room_tenants")
            .select("*", { count: 'exact' })
            .eq("room_id", roomId)
            .is("end_date", null);

        if (countError) {
            throw new Error("Error checking room occupancy");
        }

        if (currentOccupants >= room.capacity) {
            alert("Cannot approve request: Room has reached maximum capacity");
            return;
        }

        // Update booking request status
        const { error: updateError } = await supabase
            .from("booking_requests")
            .update({ status: "approved" })
            .eq("id", requestId);

        if (updateError) {
            throw new Error("Error updating booking request");
        }

        // Create room tenant record
        const { error: tenantError } = await supabase
            .from("room_tenants")
            .insert([{
                tenant_id: request.tenant_id,
                room_id: roomId,
                start_date: new Date().toISOString()
            }]);

        if (tenantError) {
            throw new Error("Error creating tenant record");
        }

        alert("Booking request approved successfully!");
        fetchBookings(); // Refresh the list

    } catch (error) {
        console.error("Error approving request:", error);
        alert("Error approving booking request. Please try again.");
    }
}

// Reject Booking Request
async function rejectRequest(requestId) {
    try {
        const { error } = await supabase
            .from("booking_requests")
            .update({ status: "rejected" })
            .eq("id", requestId);

        if (error) {
            throw new Error("Error rejecting booking request");
        }

        alert("Booking request rejected successfully!");
        fetchBookings(); // Refresh the list

    } catch (error) {
        console.error("Error rejecting request:", error);
        alert("Error rejecting booking request. Please try again.");
    }
}

// Initialize
document.addEventListener("DOMContentLoaded", fetchBookings);
