const express = require("express");
const axios= require('axios');

const config = require("../config.json");
const restaurantLogic=require("../business-logic-layer/restaurant-logic")


const router = express.Router();


router.post("/:email", async (req, res) => {
    try {        
        const RecEmail = req.params.email;
        const sentHtmlContent = req.body.htmlContent;
        const sentSubject = req.body.subject;
        
        const emailRes = await axios.post('https://api.brevo.com/v3/smtp/email', {
            sender: { name: 'Reservations no-reply', email: 'yisrael@atlow.co.il' },
            to: [{ email:RecEmail }],
            subject: sentSubject,
            htmlContent: sentHtmlContent
        }, {
            headers: {
                'api-key': config.brevo.api,
                'Content-Type': 'application/json'
            }
        });
        
        if (emailRes.data) {
            return res.send({ data: res.data })
        } else
            return res.status(500).send({ message: "Error sending email" });
    } catch (error) {
        console.log(error);
        res.status(500).send({ message: "Server error" })
    }
});


router.get("/download-ics/:id", async (req, res) => {
    console.log("111");
    
    try {
        const reservationId = req.params.id;
        const results = await restaurantLogic.getReservationByIdAsync(reservationId);
        if (!results || results.length === 0) {
            return res.status(404).send("Reservation not found");
        }

        const reservation = results[0];
        const start = new Date(reservation.date);
        const end = new Date(start.getTime() + 1.5 * 60 * 60 * 1000); 

        const formatDate = (date) =>
            date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

        const icsContent = `
        BEGIN:VCALENDAR
        VERSION:2.0
        PRODID:-//YourCompany//ReservationSystem//EN
        BEGIN:VEVENT
        UID:${reservation.id}@restaurant.com
        DTSTAMP:${formatDate(new Date())}
        DTSTART:${formatDate(start)}
        DTEND:${formatDate(end)}
        SUMMARY:Reservation at ${reservation.locationName}
        DESCRIPTION:Reservation for ${reservation.participants} people. Name: ${reservation.name}
        LOCATION:${reservation.locationName}
        END:VEVENT
        END:VCALENDAR
        `.trim();

        res.setHeader("Content-Type", "text/calendar");
        res.setHeader("Content-Disposition", `attachment; filename=reservation-${reservation.id}.ics`);
        res.send(icsContent);
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});

module.exports = router;