import { supabase } from "../db/supabase.js";
import { getUserDetails } from "../js/auth.js";

// Fetch All Booking Requests
async function fetchAllBookings() {
    const user = getUserDetails();

    // Check if user is a landlord, otherwise redirect to dashboard
    if (user.role !== "landlord") {
        window.location.href = "dashboard.html";
        return;
    }
    
    console.log("Fetching all booking requests for landlord:", user);

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
        document.getElementById("bookingListTable").innerHTML = `<tr><td colspan="7" class="p-3 text-red-500 text-center">Error loading booking requests.</td></tr>`;
        return;
    }

    if (!bookingRequests || bookingRequests.length === 0) {
        document.getElementById("bookingListTable").innerHTML = `<tr><td colspan="7" class="p-3 text-gray-500 text-center">No booking requests found.</td></tr>`;
        return;
    }

    // Get tenant details for each request
    const tenantIds = bookingRequests.map(request => request.tenant_id);
    const { data: tenants, error: tenantsError } = await supabase
        .from("users")
        .select("id, first_name, last_name, email, phone")
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

    const bookingListTable = document.getElementById("bookingListTable");
    bookingListTable.innerHTML = bookingRequests
        .map((request) => {
            const roomNumber = request.rooms ? request.rooms.room_number : "N/A";
            const tenant = tenantMap[request.tenant_id] || null;
            const tenantName = tenant ? `${tenant.first_name} ${tenant.last_name}` : "Unknown Tenant";
            const tenantEmail = tenant ? tenant.email : "N/A";
            const tenantPhone = tenant ? tenant.phone : "N/A";
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
                    <button onclick="approveRequest('${request.id}', '${request.rooms?.id}')" 
                            class="bg-green-500 text-white px-3 py-1 rounded mr-2 ${isRoomFull ? 'opacity-50 cursor-not-allowed' : ''}"
                            ${isRoomFull ? 'disabled' : ''}>
                        Approve
                    </button>
                    <button onclick="rejectRequest('${request.id}')" 
                            class="bg-red-500 text-white px-3 py-1 rounded">
                        Reject
                    </button>
                `
                : '';

            return `
                <tr class="border-b">
                    <td class="p-3">${roomNumber}</td>
                    <td class="p-3">${tenantName}</td>
                    <td class="p-3">${tenantEmail}</td>
                    <td class="p-3">${tenantPhone}</td>
                    <td class="p-3">${new Date(request.request_date).toLocaleDateString()}</td>
                    <td class="p-3 ${statusColorClass}">${request.status}</td>
                    <td class="p-3">${actionButtons}</td>
                </tr>
            `;
        })
        .join("");
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

        // Check if tenant already has an active booking
        const { data: activeBookings, error: activeBookingsError } = await supabase
            .from("room_tenants")
            .select("*")
            .eq("tenant_id", request.tenant_id)
            .is("end_date", null);

        if (activeBookingsError) {
            throw new Error("Error checking active bookings");
        }

        if (activeBookings && activeBookings.length > 0) {
            alert("Cannot approve request: Tenant already has an active booking");
            return;
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

        // Reject any other pending booking requests from this tenant
        const { error: rejectOtherRequestsError } = await supabase
            .from("booking_requests")
            .update({ status: "rejected" })
            .eq("tenant_id", request.tenant_id)
            .eq("status", "pending")
            .neq("id", requestId);

        if (rejectOtherRequestsError) {
            console.error("Error rejecting other pending requests:", rejectOtherRequestsError);
        }

        alert("Booking request approved successfully!");
        fetchAllBookings(); // Refresh the list

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
        fetchAllBookings(); // Refresh the list

    } catch (error) {
        console.error("Error rejecting request:", error);
        alert("Error rejecting booking request. Please try again.");
    }
}

// Make functions available globally
window.approveRequest = approveRequest;
window.rejectRequest = rejectRequest;

// Initialize the booking management page
document.addEventListener("DOMContentLoaded", fetchAllBookings);
