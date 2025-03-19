import { supabase } from "../db/supabase.js";

// Ensure that only tenants can access the bills page
document.addEventListener("DOMContentLoaded", () => {
    const user = JSON.parse(localStorage.getItem("user"));
    
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
    fetchBillingHistory(user.id);  // Fetch billing history from `billing_record`
    setInterval(checkDueBills, 60000);
});

// Fetch Bills (Active Bills)
async function fetchBills() {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return;

    const { data, error } = await supabase
        .from("bills")
        .select("*")
        .eq("tenant_id", user.id)
        .order("due_date", { ascending: true });

    if (error) {
        console.error("Error fetching bills:", error.message);
        return;
    }

    const billList = document.getElementById("billListTable");
    billList.innerHTML = "";

    if (data.length === 0) {
        billList.innerHTML = `<tr><td class="p-3 text-gray-600" colspan="3">No active bills found.</td></tr>`;
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
}

// Fetch Billing History (Archived Bills)
async function fetchBillingHistory(tenantId) {
    const { data, error } = await supabase
        .from("billing_record")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("due_date", { ascending: false });

    if (error) {
        console.error("Error fetching billing history:", error.message);
        return;
    }

    // Store original data globally for filtering
    window.billingData = data;
    displayBillingHistory(data);
}
document.getElementById("monthFilter").addEventListener("change", function () {
    const selectedMonth = this.value;
    filterBillingHistory(selectedMonth);
});

function filterBillingHistory(month) {
    let filteredData = window.billingData;

    if (month !== "all") {
        filteredData = window.billingData.filter(bill => {
            const billMonth = new Date(bill.due_date).getMonth() + 1; // JavaScript months are 0-based
            return billMonth == month;
        });
    }

    displayBillingHistory(filteredData);
}


// Display Billing History in Table
function displayBillingHistory(bills) {
    const billHistoryTable = document.getElementById("billHistoryTable");
    billHistoryTable.innerHTML = "";

    if (bills.length === 0) {
        billHistoryTable.innerHTML = `<tr><td colspan="3" class="text-gray-600">No billing history found for this month.</td></tr>`;
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
    const user = JSON.parse(localStorage.getItem("user"));
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
