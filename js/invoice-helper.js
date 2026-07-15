// Professional PDF invoice generator with image logo loading for Night Howls e-commerce platform
window.downloadInvoicePDF = function(order) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        console.error("jsPDF library is not loaded.");
        alert("Invoice generation failed: jsPDF is not loaded. Please try again.");
        return;
    }

    // Load the logo image asynchronously
    const img = new Image();
    img.src = '/images/logo.png';
    img.onload = function() {
        generatePDF(order, img);
    };
    img.onerror = function() {
        console.warn("Logo image failed to load. Generating PDF with vector fallback.");
        generatePDF(order, null);
    };

    function generatePDF(order, logoImg) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');

        // Colors
        const primaryColor = [15, 23, 42]; // Slate 900
        const accentColor = [212, 175, 55]; // Gold Accent
        const grayColor = [100, 116, 139]; // Slate 500
        const lightGrayColor = [248, 250, 252]; // Slate 50
        const whiteColor = [255, 255, 255];
        const redColor = [239, 68, 68]; // Red for discounts

        // Helper to draw horizontal lines
        function drawLine(y, width = 0.2, color = [226, 232, 240]) {
            doc.setDrawColor(color[0], color[1], color[2]);
            doc.setLineWidth(width);
            doc.line(15, y, 195, y);
        }

        // --- HEADER SECTION ---
        if (logoImg) {
            // Draw loaded logo image (resized and positioned professionally)
            doc.addImage(logoImg, 'PNG', 15, 14, 16, 16);
            
            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.setFont("Helvetica", "bold");
            doc.setFontSize(22);
            doc.text("NIGHTHOWLS", 35, 23);

            doc.setFont("Helvetica", "normal");
            doc.setFontSize(7.5);
            doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
            doc.text("PREMIUM SHOPPING EXPERIENCE", 35, 27);
        } else {
            // Fallback Vector Logo (Gold Circle/Crescent & Text)
            doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
            doc.circle(23, 23, 5, 'F');
            doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.circle(25, 23, 4.5, 'F');

            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.setFont("Helvetica", "bold");
            doc.setFontSize(22);
            doc.text("NIGHTHOWLS", 32, 26);

            doc.setFont("Helvetica", "normal");
            doc.setFontSize(7.5);
            doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
            doc.text("PREMIUM SHOPPING EXPERIENCE", 32, 30);
        }

        // Invoice Title & Metadata (Right Aligned)
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(20);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text("INVOICE", 150, 25);

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
        doc.text(`Invoice No: INV-${order.order_id}`, 150, 31);
        
        const orderDate = new Date(order.created_at || order.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        doc.text(`Order Date: ${orderDate}`, 150, 36);

        // Decorative line below header
        doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.setLineWidth(1.2);
        doc.line(15, 45, 195, 45);

        // --- BILLING & SHIPPING DETAILS ---
        let y = 55;
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text("CUSTOMER DETAILS", 15, y);
        doc.text("SHIPPING DETAILS", 110, y);

        y += 5;
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
        
        // Customer Info (Left side)
        doc.text(`Name: ${order.customer_name || order.customerName || 'N/A'}`, 15, y);
        doc.text(`Email: ${order.customer_email || order.customerEmail || 'N/A'}`, 15, y + 5);
        doc.text(`Phone: ${order.phone || 'N/A'}`, 15, y + 10);
        doc.text(`Payment: ${order.payment_method || order.paymentMethod || 'COD'}`, 15, y + 15);
        const statusLabel = String(order.status || 'pending').toUpperCase();
        doc.text(`Status: ${statusLabel}`, 15, y + 20);

        // Shipping Info (Right side)
        let shipping = order.shipping_address || order.shippingAddress;
        if (typeof shipping === 'string') {
            try {
                shipping = JSON.parse(shipping);
            } catch(e) {
                shipping = {};
            }
        }
        const streetAddr = `${shipping.house_number || ''} ${shipping.street || ''}`;
        const cityAddr = `${shipping.town || ''}, ${shipping.city || ''}`;
        const countryAddr = `${shipping.country || 'Pakistan'}`;

        doc.text(`Address: ${streetAddr}`, 110, y);
        doc.text(cityAddr, 110, y + 5);
        doc.text(countryAddr, 110, y + 10);
        if (shipping.order_notes || shipping.orderNotes) {
            const notesText = shipping.order_notes || shipping.orderNotes;
            doc.text(`Notes: ${notesText.substring(0, 45)}`, 110, y + 15);
        }

        // --- ITEMS TABLE ---
        y += 35;
        
        // Draw table header background (slate color)
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(15, y, 180, 8, 'F');

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(whiteColor[0], whiteColor[1], whiteColor[2]);
        doc.text("ITEM DESCRIPTION", 18, y + 5.5);
        doc.text("VARIANT", 110, y + 5.5);
        doc.text("QTY", 145, y + 5.5, { align: "center" });
        doc.text("PRICE", 168, y + 5.5, { align: "right" });
        doc.text("TOTAL", 192, y + 5.5, { align: "right" });

        y += 8;
        
        doc.setFont("Helvetica", "normal");
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);

        const items = order.items || [];
        items.forEach((item, index) => {
            // Alternating row backgrounds
            if (index % 2 === 1) {
                doc.setFillColor(lightGrayColor[0], lightGrayColor[1], lightGrayColor[2]);
                doc.rect(15, y, 180, 8, 'F');
            }
            
            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.setFontSize(8.5);
            
            // Truncate long names to prevent overlap
            const productName = item.product_name || item.productName || 'Item';
            const displayName = productName.length > 40 ? productName.substring(0, 37) + '...' : productName;
            doc.text(displayName, 18, y + 5.5);
            
            // Variant (Color/Size)
            const variants = [];
            if (item.color) variants.push(`Color: ${item.color}`);
            if (item.size) variants.push(`Size: ${item.size}`);
            const variantText = variants.length > 0 ? variants.join(' • ') : '-';
            doc.text(variantText, 110, y + 5.5);

            // Qty
            doc.text(String(item.quantity || 1), 145, y + 5.5, { align: "center" });

            // Price
            const unitPrice = Number(item.price || item.unit_price || 0);
            doc.text(`Rs. ${unitPrice.toFixed(2)}`, 168, y + 5.5, { align: "right" });

            // Total
            const totalLine = unitPrice * Number(item.quantity || 1);
            doc.text(`Rs. ${totalLine.toFixed(2)}`, 192, y + 5.5, { align: "right" });

            // Horizontal line below row
            drawLine(y + 8, 0.15, [241, 245, 249]);

            y += 8;
        });

        // --- SUMMARY SECTION ---
        y += 10;
        
        // Draw totals container box
        const boxWidth = 80;
        const boxHeight = 35;
        const boxX = 115;
        
        doc.setFillColor(lightGrayColor[0], lightGrayColor[1], lightGrayColor[2]);
        doc.rect(boxX, y, boxWidth, boxHeight, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.rect(boxX, y, boxWidth, boxHeight, 'S');

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
        
        // Labels
        doc.text("Subtotal:", boxX + 4, y + 6);
        
        const discountPct = order.discount_percentage != null
            ? Number(order.discount_percentage)
            : (Number(order.subtotal) > 0 ? (Number(order.discount_total || order.discountTotal || 0) / Number(order.subtotal) * 100) : 0);
        
        const discountLabel = order.promo_code || order.promoCode
            ? `Discount (${order.promo_code || order.promoCode} - ${discountPct.toFixed(0)}%):`
            : `Discount (${discountPct.toFixed(0)}%):`;
        doc.text(discountLabel, boxX + 4, y + 13);
        
        doc.text("Shipping:", boxX + 4, y + 20);

        // Subtotal Value
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(`Rs. ${Number(order.subtotal || 0).toFixed(2)}`, boxX + boxWidth - 4, y + 6, { align: "right" });
        
        // Discount Value (Red Text)
        doc.setTextColor(redColor[0], redColor[1], redColor[2]);
        doc.text(`-Rs. ${Number(order.discount_total || order.discountTotal || 0).toFixed(2)}`, boxX + boxWidth - 4, y + 13, { align: "right" });

        // Shipping Value
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(`Rs. ${Number(order.shipping || 100).toFixed(2)}`, boxX + boxWidth - 4, y + 20, { align: "right" });

        // Internal divider line
        doc.setDrawColor(203, 213, 225);
        doc.line(boxX + 2, y + 25, boxX + boxWidth - 2, y + 25);

        // Final Total
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text("Final Total:", boxX + 4, y + 31);
        doc.text(`Rs. ${Number(order.total_amount || order.totalAmount || 0).toFixed(2)}`, boxX + boxWidth - 4, y + 31, { align: "right" });

        // --- FOOTER SECTION ---
        doc.setFont("Helvetica", "italic");
        doc.setFontSize(9);
        doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
        doc.text("Thank you for choosing Night Howls!", 105, 270, { align: "center" });

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(7.5);
        doc.text("If you have any questions or complaints about this invoice, contact support@nighthowls.com", 105, 275, { align: "center" });

        // Save PDF file
        doc.save(`Invoice_Order_${order.order_id}.pdf`);
    }
};
