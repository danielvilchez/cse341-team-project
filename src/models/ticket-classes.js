import ticketClass from "./schemas/ticket-classes.js";

/** returns all the ticket classes **/
const getAllTicketClasses = () => {
	return ticketClass.find().lean();
}

/** returns all the tickets avaliable for a day **/
const getTicketClassesForDay = (day) => {
	return ticketClass.find({days:day}).lean();
}


export {getAllTicketClasses, getTicketClassesForDay };
