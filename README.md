# PrepPal - AI-Powered Grocery Delivery Platform

**Final Graduate Project - Computer Science Degree**  
*The Academic College of Tel Aviv*

## Team Members

### Development Team
- **Niv Siman Tov** - Full-stack Development & Database Design
- **Lilach Kuperstein** - Full-stack Development & User Experience 
- **Matan Moskovich** - Backend Services & AI Integration 

### Academic Supervisor
- **Yogev Shani** - The Academic College of Tel Aviv

---

## Live Demo
- **Customer Site**: [https://master.d2zvlwwhqwts87.amplifyapp.com/](https://master.d2zvlwwhqwts87.amplifyapp.com/)
- **Store Site**: [https://master.d30twuvk5wgog5.amplifyapp.com](https://master.d30twuvk5wgog5.amplifyapp.com)
- **Driver Site**: [https://master.d2rrhn3fd2wb45.amplifyapp.com/](https://master.d2rrhn3fd2wb45.amplifyapp.com/)

## What is PrepPal?

PrepPal is an innovative AI-powered grocery delivery platform that revolutionizes the way people shop for groceries. The platform connects customers, store owners, and delivery drivers through an intelligent chat-based interface, making grocery shopping as simple as having a conversation.

### Key Features
- **🤖 AI Shopping Assistant**: Natural language ordering powered by OpenAI GPT-4
- **📍 Real-time Tracking**: Live order status updates and driver location tracking
- **🏪 Multi-tenant Platform**: Dedicated interfaces for customers, stores, and drivers
- **🗺️ GPS Integration**: Location-based store discovery and driver assignment
- **💳 Payment Processing**: Seamless PayPal integration for secure transactions
- **📱 Mobile-First Design**: Responsive design optimized for all devices

## System Architecture

PrepPal is built on a modern microservices architecture leveraging AWS cloud services:

### Architecture Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Customer UI   │    │   Store UI      │    │   Driver UI     │    │  Payment UI     │
│   (React)       │    │   (React)       │    │   (React)       │    │   (React)       │
│                 │    │                 │    │                 │    │                 │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │                      │
          └──────────────────────┼──────────────────────┼──────────────────────┘
                                 │                      │
                    ┌─────────────┴─────────────┐      │
                    │     AWS API Gateway        │      │
                    │   (REST + WebSocket)      │      │
                    └─────────────┬─────────────┘      │
                                  │                    │
        ┌─────────────────────────┼────────────────────┼─────────────────────────┐
        │                         │                    │                         │
┌───────▼────────┐    ┌──────────▼──────────┐    ┌────▼────────┐    ┌──────────▼──────────┐
│ AI Chat        │    │ Store Management    │    │ Driver      │    │ Payment              │
│ Lambda         │    │ Lambda              │    │ Services    │    │ Lambda               │
│ (C# .NET)      │    │ (C# .NET)           │    │ Lambda      │    │ (Python)             │
│ GPT-4 Integration│   │ Product CRUD        │    │ (C# .NET)   │    │ PayPal API           │
└───────┬────────┘    └──────────┬──────────┘    └────┬────────┘    └──────────┬──────────┘
        │                         │                    │                         │
        └─────────────────────────┼────────────────────┼─────────────────────────┘
                                  │                    │
        ┌─────────────────────────┼────────────────────┼─────────────────────────┐
        │                         │                    │                         │
┌───────▼────────┐                │                ┌───▼────────┐                │
│   DynamoDB     │                │                │   RDS      │                │
│ (Chat Sessions,│                │                │ (Products, │                │
│ Orders,        │                │                │  Stores,   │                │
│ User Sessions) │                │                │  Users)    │                │
└────────────────┘                │                └────────────┘                │
                                  │                                              │
                    ┌─────────────┴─────────────┐                ┌──────────────▼─────────────┐
                    │     AWS Cognito           │                │     External APIs          │
                    │   (User Management)       │                │   (Google Maps,            │
                    │   Authentication          │                │    OpenStreetMap,          │
                    │   Authorization           │                │    OpenAI GPT-4)           │
                    └───────────────────────────┘                └─────────────────────────────┘
```

### Key Components:

**Frontend Applications:**
- **Customer Screen**: AI chat interface, order tracking, address validation
- **Store Front**: Inventory management, order processing, real-time notifications  
- **Driver Screen**: GPS tracking, order acceptance, delivery management
- **Payment Pages**: PayPal integration, payment confirmation

**Backend Services:**
- **Client Chat Lambda**: AI-powered shopping assistant with GPT-4
- **Store Management Lambdas**: Product CRUD, inventory management
- **Driver Services**: Order assignment, delivery tracking, GPS integration
- **Payment Processing**: PayPal API integration, order confirmation

**Data Storage:**
- **DynamoDB**: Real-time data (chat sessions, orders, user sessions)
- **RDS**: Structured data (products, stores, user profiles)
- **AWS Cognito**: User authentication and management

**External Integrations:**
- **OpenAI GPT-4**: Natural language processing for shopping assistance
- **Google Maps API**: Navigation and location services
- **OpenStreetMap**: Address validation and geocoding
- **PayPal API**: Payment processing

### Frontend Applications
- **4 React Applications** deployed on AWS Amplify
- **Real-time Updates** using WebSocket connections
- **Responsive Design** for optimal user experience across devices

### Backend Services
- **AWS Lambda Functions** (C#, Python, NodeJS) for serverless computing
- **RESTful APIs** (API Gateway) with comprehensive error handling
- **Event-driven Architecture** for real-time processing

### Database Strategy
- **AWS RDS (PostgreSQL)**: Structured data for products, stores, and user profiles
- **AWS DynamoDB**: Real-time data for orders, chat sessions, and live tracking
- **Optimized Queries**: Efficient data retrieval and storage patterns


## Applications Overview

### 🛒 Customer Application
**Features:**
- AI-powered chat interface for natural language ordering
- Order history and active order tracking
- Real-time order status updates
- Payment processing integration

**Technology:** React 19, AWS Cognito, OpenAI GPT-4, Google Maps API

### 🏪 Store Management Application
**Features:**
- Comprehensive inventory management (CRUD operations)
- Real-time order processing and status updates
- Product categorization and advanced search
- Automated customer notifications
- Sales analytics and reporting

**Technology:** React 19, Socket.io, AWS Lambda, RDS integration

### 🚗 Driver Application
**Features:**
- GPS-based nearby order discovery (15km radius)
- Order acceptance and delivery tracking
- Google Maps integration for optimal navigation
- Earnings calculation and tracking (8% commission)
- Real-time location updates

**Technology:** React 19, Geolocation API, Google Maps, Real-time tracking

### 💳 Payment Processing
**Features:**
- PayPal payment integration
- Order confirmation and receipt generation
- Payment success/failure handling
- Automated email notifications

**Technology:** React with TypeScript, PayPal API, AWS Lambda

## Technology Stack

### Frontend
- **React 19** with modern hooks and functional components
- **TypeScript** for type safety and better development experience
- **CSS3** with responsive design principles
- **React Router** for client-side routing

### Backend
- **AWS Lambda** for serverless computing
- **C# (.NET)** for business logic and AI integration
- **Python** for payment processing and utility services
- **AWS API Gateway** for API management

### Database
- **AWS RDS (PostgreSQL)** for structured data
- **AWS DynamoDB** for real-time and session data
- **Optimized schemas** for performance and scalability

### AI & Machine Learning
- **OpenAI GPT-4** for natural language processing
- **Custom prompt engineering** for shopping assistance
- **Context-aware responses** for personalized experience
- **Product recommendation algorithms**

### Cloud Services
- **AWS Amplify** for frontend deployment and hosting
- **AWS Cognito** for user authentication and management
- **AWS Lambda** for serverless backend functions
- **AWS S3** for static asset storage

### External APIs
- **Google Maps API** for navigation and location services
- **OpenStreetMap** for address validation and geocoding
- **PayPal API** for payment processing
- **OpenAI API** for AI-powered conversations

## Core Functionality

### AI-Powered Shopping Experience
- Natural language order processing
- Intelligent product recommendations
- Context-aware conversation handling
- Store-specific product filtering
- Allergy and dietary preference tracking

### Real-time Operations
- Live order status updates
- Instant driver assignment
- Real-time inventory management
- WebSocket-based notifications
- GPS tracking for deliveries

### Location Intelligence
- GPS-based store and driver matching
- Real-time location tracking
- Distance-based order assignment
- Optimized delivery routes

### Business Logic
- Multi-tenant architecture
- Role-based access control
- Automated email notifications
- Payment processing workflows
- Inventory management systems

## Academic Context

This project demonstrates mastery of:

### Software Engineering Principles
- **Full-stack Development**: Complete application lifecycle
- **Microservices Architecture**: Scalable and maintainable design
- **Cloud Computing**: AWS services integration and optimization
- **Real-time Systems**: WebSocket and polling mechanisms

### AI Integration
- **Natural Language Processing**: OpenAI GPT-4 implementation
- **Prompt Engineering**: Optimized AI responses
- **Context Management**: Conversation state handling

### Database Design
- **Hybrid Database Strategy**: SQL and NoSQL integration
- **Query Optimization**: Efficient data retrieval patterns
- **Data Modeling**: Normalized and denormalized approaches
- **Real-time Synchronization**: Live data updates

### User Experience
- **Accessibility**: Inclusive design principles
- **Performance Optimization**: Fast loading and smooth interactions
- **User Testing**: Iterative design improvements

## Live Demo Experience

Experience the full platform functionality through our live applications:

1. **Start as a Customer**: Visit the customer site to experience AI-powered shopping
2. **Manage as a Store**: Access the store interface to see inventory management
3. **Deliver as a Driver**: Use the driver app to understand the delivery workflow

The platform showcases a complete end-to-end grocery delivery solution with real-time features, AI integration, and comprehensive business logic.



*This project represents the culmination of academic learning in computer science, demonstrating practical application of modern software development practices, cloud computing, and artificial intelligence integration.*
