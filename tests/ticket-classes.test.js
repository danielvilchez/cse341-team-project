import {describe, expect, test} from "vitest";
import request from "supertest";
import app from "../app.js";

describe("Ticket classes API", async () => {
    
    // ticket-classes api
    test("GET /api/ticket-classes retrieves all ticket class with status 200", async ()=> {
        const response = await request(app).get("/api/ticket-classes");

        //reponse status 200?
        //reponse is JSON?
        expect(response.status).toBe(200);
        expect(response.headers["content-type"]).toContain("application/json");
    
        //is array? retrieves more than 1 element?
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(1);

        //properties
        for (const ticketClass of response.body) {
            expect(ticketClass).toHaveProperty("class");
            expect(ticketClass).toHaveProperty("name");
            expect(ticketClass).toHaveProperty("pricePerKm");
            expect(ticketClass).toHaveProperty("amenities");
            expect(ticketClass).toHaveProperty("description");
            expect(ticketClass).toHaveProperty("days");
        }
    });

    //test ticket-classes with a bad param
    test("GET /api/ticket-classes?day={invalidDay} retrives status 400", async () => {
        const response = await request(app).get("/api/ticket-classes?day=monray");

        //reponse status 400
        //reponse is JSON?
        expect(response.status).toBe(400);
        expect(response.headers["content-type"]).toContain("application/json");
        expect(response.body).toHaveProperty("message");
    });

    //test ticket-classes with a valid day
    test("GET /api/ticket-classes?day={validDay} retrieves status 200", async () => {
        const response = await request(app).get("/api/ticket-classes?day=monday");

        //reponse status 200
        //reponse is JSON?
        expect(response.status).toBe(200);
        expect(response.headers["content-type"]).toContain("application/json");
        
        //is array? retrieves more than 1 element?
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(1);

        //properties
        for (const ticketClass of response.body) {
            expect(ticketClass).toHaveProperty("class");
            expect(ticketClass).toHaveProperty("name");
            expect(ticketClass).toHaveProperty("pricePerKm");
            expect(ticketClass).toHaveProperty("amenities");
            expect(ticketClass).toHaveProperty("description");
            expect(ticketClass).toHaveProperty("days");
        }

    })
})