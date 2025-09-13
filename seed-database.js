/**
 * Database Seeding Script - Sample Events
 * Creates sample events for testing and demonstration
 */

import { query } from './src/config/database.js';
import { logger } from './src/utils/logger.js';

const sampleEvents = [
  {
    title: "Summer Music Festival 2025",
    description: "Join us for the biggest music festival of the summer featuring top artists from around the world. Experience three days of non-stop music, food, and entertainment.",
    short_description: "Three days of world-class music, food, and entertainment",
    category: "Music",
    subcategory: "Festival",
    venue_name: "Central Park Amphitheater",
    venue_address: "123 Park Avenue",
    venue_city: "New York",
    venue_state: "NY",
    venue_country: "USA",
    venue_postal_code: "10001",
    venue_capacity: 50000,
    start_datetime: "2025-07-15 18:00:00",
    end_datetime: "2025-07-17 23:00:00",
    status: "published",
    featured_image: "/static/images/music-festival.jpg",
    tags: "music,festival,summer,outdoor",
    age_restriction: 18,
    price_min: 89.99,
    price_max: 299.99
  },
  {
    title: "Tech Innovation Conference",
    description: "Discover the latest innovations in technology with industry leaders, startups, and visionaries. Network with professionals and learn about cutting-edge developments.",
    short_description: "Leading tech conference with industry experts",
    category: "Technology",
    subcategory: "Conference",
    venue_name: "Convention Center",
    venue_address: "456 Tech Boulevard",
    venue_city: "San Francisco",
    venue_state: "CA",
    venue_country: "USA",
    venue_postal_code: "94102",
    venue_capacity: 2000,
    start_datetime: "2025-09-20 09:00:00",
    end_datetime: "2025-09-22 17:00:00",
    status: "published",
    featured_image: "/static/images/tech-conference.jpg",
    tags: "technology,innovation,conference,networking",
    age_restriction: 0,
    price_min: 149.99,
    price_max: 599.99
  },
  {
    title: "Broadway Musical: The Greatest Show",
    description: "Experience the magic of Broadway with this spectacular musical featuring stunning performances, incredible choreography, and unforgettable songs.",
    short_description: "Award-winning Broadway musical with spectacular performances",
    category: "Theater",
    subcategory: "Musical",
    venue_name: "Majestic Theater",
    venue_address: "789 Broadway",
    venue_city: "New York",
    venue_state: "NY",
    venue_country: "USA",
    venue_postal_code: "10019",
    venue_capacity: 1800,
    start_datetime: "2025-10-01 19:30:00",
    end_datetime: "2025-10-01 22:00:00",
    status: "published",
    featured_image: "/static/images/broadway-musical.jpg",
    tags: "theater,broadway,musical,entertainment",
    age_restriction: 0,
    price_min: 59.99,
    price_max: 199.99
  },
  {
    title: "Food & Wine Festival",
    description: "Celebrate culinary excellence with renowned chefs, wine tastings, cooking demonstrations, and gourmet food from around the world.",
    short_description: "Culinary celebration with renowned chefs and wine tastings",
    category: "Food & Drink",
    subcategory: "Festival",
    venue_name: "Harbor Convention Center",
    venue_address: "321 Waterfront Drive",
    venue_city: "Miami",
    venue_state: "FL",
    venue_country: "USA",
    venue_postal_code: "33101",
    venue_capacity: 5000,
    start_datetime: "2025-11-05 12:00:00",
    end_datetime: "2025-11-07 22:00:00",
    status: "published",
    featured_image: "/static/images/food-wine-festival.jpg",
    tags: "food,wine,culinary,festival,tasting",
    age_restriction: 21,
    price_min: 39.99,
    price_max: 149.99
  },
  {
    title: "International Art Exhibition",
    description: "Discover masterpieces from contemporary artists worldwide. This exclusive exhibition features paintings, sculptures, and digital art installations.",
    short_description: "Contemporary art exhibition with international artists",
    category: "Art",
    subcategory: "Exhibition",
    venue_name: "Modern Art Museum",
    venue_address: "654 Museum Mile",
    venue_city: "Chicago",
    venue_state: "IL",
    venue_country: "USA",
    venue_postal_code: "60601",
    venue_capacity: 800,
    start_datetime: "2025-09-01 10:00:00",
    end_datetime: "2025-12-31 18:00:00",
    status: "published",
    featured_image: "/static/images/art-exhibition.jpg",
    tags: "art,exhibition,contemporary,culture",
    age_restriction: 0,
    price_min: 15.99,
    price_max: 35.99
  },
  {
    title: "Sports Championship Finals",
    description: "Witness the ultimate showdown as the top teams compete for the championship title. An electrifying atmosphere with non-stop action.",
    short_description: "Championship finals with top teams competing",
    category: "Sports",
    subcategory: "Championship",
    venue_name: "Olympic Stadium",
    venue_address: "987 Victory Lane",
    venue_city: "Los Angeles",
    venue_state: "CA",
    venue_country: "USA",
    venue_postal_code: "90012",
    venue_capacity: 80000,
    start_datetime: "2025-10-15 14:00:00",
    end_datetime: "2025-10-15 17:00:00",
    status: "published",
    featured_image: "/static/images/sports-championship.jpg",
    tags: "sports,championship,competition,finals",
    age_restriction: 0,
    price_min: 29.99,
    price_max: 399.99
  }
];

const sampleTicketTypes = [
  // Summer Music Festival
  { event_id: null, name: "General Admission", description: "Access to all festival areas", price: 89.99, quantity_available: 30000, max_per_order: 8 },
  { event_id: null, name: "VIP Experience", description: "VIP viewing area, complimentary drinks", price: 199.99, quantity_available: 5000, max_per_order: 4 },
  { event_id: null, name: "Premium Package", description: "Backstage access, meet & greet", price: 299.99, quantity_available: 1000, max_per_order: 2 },
  
  // Tech Conference
  { event_id: null, name: "Standard Pass", description: "Full conference access", price: 149.99, quantity_available: 1500, max_per_order: 5 },
  { event_id: null, name: "Premium Pass", description: "Conference + workshops + networking dinner", price: 299.99, quantity_available: 400, max_per_order: 3 },
  { event_id: null, name: "VIP Pass", description: "All access + private sessions + lunch with speakers", price: 599.99, quantity_available: 100, max_per_order: 2 },
  
  // Broadway Musical
  { event_id: null, name: "Orchestra", description: "Premium front seating", price: 199.99, quantity_available: 400, max_per_order: 6 },
  { event_id: null, name: "Mezzanine", description: "Elevated seating with great views", price: 129.99, quantity_available: 600, max_per_order: 8 },
  { event_id: null, name: "Balcony", description: "Upper level seating", price: 59.99, quantity_available: 800, max_per_order: 10 },
  
  // Food & Wine Festival
  { event_id: null, name: "Tasting Pass", description: "Access to all tastings", price: 39.99, quantity_available: 3000, max_per_order: 4 },
  { event_id: null, name: "Chef's Table", description: "Exclusive dining experience", price: 149.99, quantity_available: 200, max_per_order: 2 },
  
  // Art Exhibition
  { event_id: null, name: "General Admission", description: "Full exhibition access", price: 15.99, quantity_available: 500, max_per_order: 10 },
  { event_id: null, name: "Guided Tour", description: "Private guided tour", price: 35.99, quantity_available: 100, max_per_order: 4 },
  
  // Sports Championship
  { event_id: null, name: "Upper Deck", description: "Stadium upper level seating", price: 29.99, quantity_available: 40000, max_per_order: 8 },
  { event_id: null, name: "Lower Bowl", description: "Mid-level stadium seating", price: 89.99, quantity_available: 30000, max_per_order: 6 },
  { event_id: null, name: "Field Level", description: "Premium field-level seating", price: 199.99, quantity_available: 8000, max_per_order: 4 },
  { event_id: null, name: "Luxury Box", description: "Private luxury suite experience", price: 399.99, quantity_available: 200, max_per_order: 2 }
];

async function seedDatabase() {
  try {
    logger.info('Starting database seeding...');
    
    // Check if events already exist
    const existingEvents = await query('SELECT COUNT(*) as count FROM events');
    if (existingEvents[0].count > 0) {
      logger.info(`Database already has ${existingEvents[0].count} events. Skipping seeding.`);
      return;
    }

    // Insert sample events
    logger.info('Inserting sample events...');
    const eventIds = [];
    
    for (const event of sampleEvents) {
      const result = await query(`
        INSERT INTO events (
          title, description, short_description, category, subcategory,
          venue_name, venue_address, venue_city, venue_state, venue_country, venue_postal_code,
          venue_capacity, start_datetime, end_datetime, status, featured_image, tags, age_restriction
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        event.title, event.description, event.short_description, event.category, event.subcategory,
        event.venue_name, event.venue_address, event.venue_city, event.venue_state, event.venue_country, event.venue_postal_code,
        event.venue_capacity, event.start_datetime, event.end_datetime, event.status, event.featured_image, event.tags, event.age_restriction
      ]);
      
      eventIds.push(result.lastID || result.insertId);
    }

    // Insert sample ticket types
    logger.info('Inserting sample ticket types...');
    let ticketIndex = 0;
    const ticketsPerEvent = [3, 3, 3, 2, 2, 4]; // Number of ticket types per event
    
    for (let i = 0; i < eventIds.length; i++) {
      const eventId = eventIds[i];
      const numTickets = ticketsPerEvent[i];
      
      for (let j = 0; j < numTickets; j++) {
        const ticket = sampleTicketTypes[ticketIndex++];
        await query(`
          INSERT INTO ticket_types (
            event_id, name, description, price, quantity_available, max_per_order
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [eventId, ticket.name, ticket.description, ticket.price, ticket.quantity_available, ticket.max_per_order]);
      }
    }

    logger.info(`Successfully seeded database with ${eventIds.length} events and ${ticketIndex} ticket types`);
    
  } catch (error) {
    logger.error('Database seeding failed:', error);
    throw error;
  }
}

// Export for use in other modules
export { seedDatabase };

// Run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(() => {
      logger.info('Database seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Database seeding failed:', error);
      process.exit(1);
    });
}