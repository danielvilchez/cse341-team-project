import { getAllTicketClasses, getTicketClassesForDay } from "../models/ticket-classes.js"

const getTicketClasses = async (req, res) => {
	const {day} = req.query;

	try{
		//missing day param
		let ticketClasses = {};
		if(!day){
			ticketClasses = await getAllTicketClasses();
			return res.status(200).json(ticketClasses);
		}

		const validDays = ["monday", "tuesday", "wednesday","thursday","friday","saturday","sunday"];
		const isValidDay = validDays.some(validDay => day.toLowerCase() === validDay);
		//invalid day
		if(!isValidDay){
			return res.status(400).json({message:"Invalid day in query named 'day'"});		
		}

		ticketClasses = await getTicketClassesForDay(day.toLowerCase());
		return res.status(200).json(ticketClasses);
		
	}catch(error){
		console.error("Error trying to get ticket classes:", error);
		return res.status(500).json({message: "Error fetching ticket classes"});
	}

}

export { getTicketClasses };
