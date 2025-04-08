import { supabase } from "../db/supabase.js";
import { getUserDetails } from "./auth.js";

// Ensure that only tenants can access the bills page
document.addEventListener("DOMContentLoaded", () => {
    const user = getUserDetails();
    
    if (!user) {
        console.warn("No user found, redirecting to login.");
        window.location.href = "login.html";  // Redirect if no user is logged in
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
    fetchBills();  
    fetchBillingHistory(user.id);  // Fetch billing history
    setInterval(checkDueBills, 60000);
});

// Fetch Bills (Active Bills)
async function fetchBills() {
    try {
        const user = getUserDetails();
        if (!user) {
            console.warn("No user found in fetchBills");
            return;
        }

        const { data, error } = await supabase
            .from("bills")
            .select("*")
            .eq("tenant_id", user.id)
            .order("due_date", { ascending: true });

        if (error) {
            console.error("Error fetching bills:", error.message);
            const billList = document.getElementById("billListTable");
            if (billList) {
                billList.innerHTML = `<tr><td class="p-3 text-red-500 text-center" colspan="3">Error loading bills. Please try again later.</td></tr>`;
            }
            return;
        }

        const billList = document.getElementById("billListTable");
        
        // Check if the element exists before trying to set its innerHTML
        if (!billList) {
            console.warn("Element with ID 'billListTable' not found in the DOM");
            return;
        }
        
        billList.innerHTML = "";

        if (!data || data.length === 0) {
            billList.innerHTML = `<tr><td class="p-3 text-gray-600 text-center" colspan="3">No active bills found.</td></tr>`;
            return;
        }

        data.forEach(bill => {
            let statusClass = getStatusClass(bill.status);
            billList.innerHTML += `
                <tr>
                    <td class="p-3 text-gray-600">₱${bill.amount}</td>
                    <td class="p-3 text-gray-600">${new Date(bill.due_date).toDateString()}</td>
                    <td class="p-3 ${statusClass}">${bill.status}</td>
                </tr>
            `;
        });
    } catch (error) {
        console.error("Unexpected error in fetchBills:", error);
        const billList = document.getElementById("billListTable");
        if (billList) {
            billList.innerHTML = `<tr><td class="p-3 text-red-500 text-center" colspan="3">An unexpected error occurred. Please try again later.</td></tr>`;
        }
    }
}

// Fetch Billing History (Archived Bills)
async function fetchBillingHistory(tenantId) {
    try {
        const { data, error } = await supabase
            .from("billing_record")
            .select("*")
            .eq("tenant_id", tenantId)
            .order("due_date", { ascending: false });

        if (error) {
            console.error("Error fetching billing history:", error.message);
            const billHistoryTable = document.getElementById("billHistoryTable");
            if (billHistoryTable) {
                billHistoryTable.innerHTML = `<tr><td colspan="3" class="text-red-500 text-center">Error loading billing history. Please try again later.</td></tr>`;
            }
            return;
        }

        // Store original data globally for filtering
        window.billingData = data || [];
        displayBillingHistory(data || []);
    } catch (error) {
        console.error("Unexpected error in fetchBillingHistory:", error);
        const billHistoryTable = document.getElementById("billHistoryTable");
        if (billHistoryTable) {
            billHistoryTable.innerHTML = `<tr><td colspan="3" class="text-red-500 text-center">An unexpected error occurred. Please try again later.</td></tr>`;
        }
    }
}

// Display Billing History in Table
function displayBillingHistory(bills) {
    const billHistoryTable = document.getElementById("billHistoryTable");
    
    // Check if the element exists before trying to set its innerHTML
    if (!billHistoryTable) {
        console.warn("Element with ID 'billHistoryTable' not found in the DOM");
        return;
    }
    
    billHistoryTable.innerHTML = "";

    if (!bills || bills.length === 0) {
        billHistoryTable.innerHTML = `<tr><td colspan="3" class="text-gray-600 text-center">No billing history found.</td></tr>`;
        return;
    }

    bills.forEach(bill => {
        let statusClass = getStatusClass(bill.status);
        billHistoryTable.innerHTML += `
            <tr>
                <td class="p-3">₱${bill.amount}</td>
                <td class="p-3">${new Date(bill.due_date).toDateString()}</td>
                <td class="p-3 ${statusClass}">${bill.status}</td>
            </tr>
        `;
    });
}

// Utility Function: Get Status Class for Styling
function getStatusClass(status) {
    switch (status) {
        case 'pending':
            return 'text-yellow-500';  // Yellow for pending
        case 'paid':
            return 'text-green-500';   // Green for paid
        case 'overdue':
            return 'text-red-500';     // Red for overdue
        default:
            return 'text-gray-500';    // Gray for unknown
    }
}

// Send Notifications (Simulated)
function sendNotification(message) {
    alert(message);
}

// Notify Due Bills
async function checkDueBills() {
    const user = getUserDetails();
    if (!user) return;

    const { data, error } = await supabase
        .from("bills")
        .select("*")
        .eq("tenant_id", user.id)
        .eq("status", "pending");

    if (data && data.length > 0) {
        sendNotification("You have pending bills due soon!");
    }
}
