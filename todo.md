# Customer Intelligence Dashboard - Project TODO

## Core Infrastructure
- [x] Database schema for customers, subsidiaries, opportunities, deals, news
- [x] tRPC routers for all data operations
- [ ] File upload and parsing utilities

## Dashboard & Navigation
- [x] Dashboard layout with sidebar navigation
- [x] Overview metrics cards (customers, opportunities, deals, alerts)
- [x] Quick access navigation to all modules

## Customer Profile Module
- [x] Customer list view with search and filters
- [x] Customer detail page with comprehensive info
- [x] Industry, size, geography, business segments display
- [x] Corporate structure overview

## Corporate Family Tree
- [x] Interactive tree diagram component
- [x] Parent company, subsidiaries, branches visualization
- [x] Hierarchical relationship display
- [x] Entity type indicators (parent/subsidiary/branch)
- [x] Expandable/collapsible tree nodes

## Business Opportunity Tracking
- [x] Opportunity list with status indicators
- [x] Opportunity pipeline visualization
- [x] Filtering by status, amount, date
- [ ] Potential vs existing opportunity separation
- [ ] Opportunity detail view

## Deal History Module
- [x] Closed deals list view
- [ ] Group-level transaction records
- [ ] Timeline visualization
- [ ] Cross-entity deal tracking (parent + subsidiaries)
- [ ] Deal statistics and summaries

## News Integration
- [x] News list display component
- [ ] Google search integration placeholder
- [x] AI analysis hooks (reserved endpoints)
- [ ] News categorization and filtering
- [ ] Related product/direction matching UI

## Data Import Interface
- [x] Data import page UI
- [ ] Excel file upload and parsing
- [ ] Word file upload and parsing
- [ ] Field mapping interface
- [ ] Corporate relationship detection
- [ ] Import preview and validation
- [ ] Batch data insertion

## Visualizations (Recharts)
- [x] Revenue trends chart
- [x] Opportunity funnel chart (pie chart)
- [ ] Deal distribution chart
- [ ] Geographic presence map/chart
- [ ] Subsidiary performance chart

## AI Analysis Panel
- [x] AI summary display component
- [x] Reserved API endpoints for AI integration
- [x] Product matching recommendations UI
- [x] Sales talking points generation
- [x] Actionable insights display

## Testing & Quality
- [x] Unit tests for tRPC procedures
- [ ] Data validation tests
- [ ] Import parsing tests


## Phase 2: Enhancement (Current)

### Sample Data
- [ ] Add 3-5 representative enterprise customers
- [ ] Add subsidiary structures for each customer
- [ ] Add sample opportunities and deals
- [ ] Add sample news items

### Excel Import
- [ ] Install xlsx parsing library
- [ ] Create file upload endpoint
- [ ] Implement Excel parsing logic
- [ ] Field mapping and data validation
- [ ] Batch insert to database

### News API Integration
- [ ] Research and select news API
- [ ] Create news fetch endpoint
- [ ] Implement customer-related news search
- [ ] Auto-populate news items

### Branding Customization
- [ ] Remove Manus login/OAuth references
- [ ] Update app title and branding
- [ ] Customize login page
- [ ] Update footer and credits


### Internationalization (i18n)
- [x] Add language context and provider
- [x] Create translation files for EN/zh-CN/zh-TW
- [x] Add language switcher component
- [x] Apply translations to key pages


## Phase 3: Standalone System (Current)

### Remove Manus Dependencies
- [x] Create standalone JWT authentication (no Manus OAuth)
- [x] Replace Manus LLM API with standard OpenAI API
- [x] Remove Manus-specific environment variables
- [x] Create portable .env.example file

### Standalone Features
- [x] Local user registration and login
- [x] Password-based authentication
- [x] Configurable OpenAI/compatible LLM endpoint
- [x] Docker deployment support

### Branding & Documentation
- [x] Remove all Manus branding
- [x] Create README with deployment instructions
- [x] Add environment configuration guide
- [x] Create sample data scripts


## Phase 4: Standalone & GitHub Ready

### Language Switching (Fix)
- [ ] Make language switcher visible in header/navbar
- [ ] Apply translations to all pages (Dashboard, Customers, etc.)
- [ ] Test language switching functionality

### Standalone Source Code
- [ ] Remove all Manus OAuth dependencies from core files
- [ ] Create standalone authentication system
- [ ] Replace Manus LLM with configurable OpenAI API
- [ ] Create portable environment configuration
- [ ] Remove "Powered by Manus" branding

### GitHub Ready
- [ ] Create complete README with setup instructions
- [ ] Add LICENSE file (MIT)
- [ ] Create .gitignore file
- [ ] Package source code for download
- [ ] Provide deployment instructions
