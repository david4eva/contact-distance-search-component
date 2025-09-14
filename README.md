# Contact Distance Search Component

![Salesforce](https://img.shields.io/badge/Salesforce-00A1E0?style=for-the-badge&logo=salesforce&logoColor=white)
![Lightning Web Components](https://img.shields.io/badge/LWC-00A1E0?style=for-the-badge&logo=salesforce&logoColor=white)
![Apex](https://img.shields.io/badge/Apex-00A1E0?style=for-the-badge&logo=salesforce&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Salesforce API](https://img.shields.io/badge/Salesforce%20API-v58.0-blue)](https://developer.salesforce.com/docs/atlas.en-us.api.meta/api/)
[![Mobile Responsive](https://img.shields.io/badge/Mobile-Responsive-brightgreen)](#responsive-design)
[![Enterprise Ready](https://img.shields.io/badge/Enterprise-Ready-success)](#enterprise-features)

A sophisticated Lightning Web Component that enables intelligent contact searching based on geospatial proximity, territory, and contact attributes. This enterprise-grade component delivers location intelligence capabilities that transform how organizations across all industries manage and engage with their contact networks.

## Demo

**📹 [Watch 3-Minute Demo Video](https://drive.google.com/file/d/1a1vpjdu8baxVGLTjbQQ5s1bCIDRX_qUe/view?usp=sharing)**

*Showcases all search modes, responsive design, and assignment functionality*

## Features

### Multi-Modal Search Capabilities
- **🗺️ Distance-Based Search**: Find contacts within customizable radius of case locations
- **📍 Territory Search**: Filter contacts by state/region for territory management
- **👤 Name Search**: Intelligent fuzzy matching across contact names

### Advanced Geospatial Functionality
- **🧮 Haversine Formula**: Custom distance calculations in Apex for accurate results
- **⚡ Performance Optimized**: Cacheable methods with efficient pagination
- **🎯 Precision Targeting**: Support for preset distances (5-200 miles) and custom radius
- **📊 Real-time Distance Display**: Shows calculated distances from case location

### Enterprise-Grade Features
- **🔒 Security-First**: Field-level security and object access validation
- **🔄 One-Click Assignment**: Assign contacts to cases with automatic page refresh
- **📄 Smart Pagination**: Server-side pagination handling thousands of records
- **🏗️ Clean Architecture**: Separation of concerns across specialized controllers

## Technical Architecture

```
├── lwc/
│   └── contactsStateModal/              # Main component
│       ├── contactsStateModal.html      # Responsive template
│       ├── contactsStateModal.js        # Component logic & debouncing
│       └── contactsStateModal.js-meta.xml
│
├── classes/
│   ├── ContactsPaginationController.cls    # Search & count operations
│   ├── ContactsByDistanceController.cls    # Geospatial calculations
│   ├── ContactsByNameController.cls        # Name-based search
│   ├── ContactsByStateController.cls       # Territory-based search
│   └── CaseAssignmentController.cls        # Assignment operations
│
└── objects/
    ├── Case/fields/Case_Location__c.field  # Geolocation field
    └── Account/                             # Uses BillingLatitude/Longitude
```

## Screenshots

### Desktop Interface
![Desktop View](screenshots/desktop-search.png)

### Mobile Responsive Design
![Mobile View](screenshots/mobile-view.png)

### Distance Search Results
![Distance Results](screenshots/distance-results.png)

### Deployment Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/contact-distance-search.git
   cd contact-distance-search
   ```

2. **Deploy to your org**
   ```bash
   sfdx force:source:deploy -p force-app/main/default/
   ```

3. **Configure Custom Fields**
   - Create `Case_Location__c` geolocation field on Case object
   - Ensure Account records have `BillingLatitude` and `BillingLongitude` populated

4. **Add to Lightning Pages**
   - Add component to Case record pages via Lightning App Builder
   - Configure component properties as needed

5. **Set Permissions**
   - Grant users access to Apex classes
   - Ensure FLS permissions for required fields

## Configuration

### Component Properties
- **Page Size**: Number of results per page (default: 50)
- **Distance Options**: Customizable radius presets
- **Mobile Breakpoint**: Screen width threshold for mobile layout (768px)

### Field Dependencies
```apex
// Required Case fields
Case_Location__c (Geolocation)
// OR
Case_Location__Latitude__s, Case_Location__Longitude__s (Number fields)

// Required Account fields  
BillingLatitude, BillingLongitude, BillingStateCode
```

## Usage Examples

### Distance-Based Search
1. Select "Distance" from search type dropdown
2. Choose radius (5-200 miles) or enter custom distance
3. Results display contacts sorted by proximity with distance shown
4. Select contact and click "Assign" to link to case

### Territory Management
1. Select "State" from search type dropdown  
2. Choose state from comprehensive US states list
3. View all contacts in selected territory
4. Assign contacts to cases for regional coordination

### Contact Name Search
1. Select "Name" from search type dropdown
2. Enter partial or complete contact name
3. View fuzzy-matched results with account context
4. Assign relevant contacts to cases

## Business Applications

### Sales & Marketing
- **Territory Optimization**: Identify prospects within travel-efficient areas
- **Route Planning**: Plan customer visits based on geographic proximity  
- **Market Analysis**: Understand contact distribution across regions
- **Lead Qualification**: Prioritize leads based on geographic accessibility

### Service & Support Operations
- **Case Assignment**: Route cases to nearest qualified contacts
- **Field Service**: Optimize technician scheduling based on location
- **Emergency Response**: Quickly locate contacts during urgent situations
- **Resource Allocation**: Deploy support teams efficiently across territories

### Healthcare & Life Sciences
- **Provider Networks**: Connect patients with nearby specialists and facilities
- **Care Coordination**: Optimize home health visits and patient outreach
- **Clinical Trial Management**: Identify participants within study catchment areas
- **Public Health**: Support contact tracing and outbreak management
- **Medical Device Distribution**: Route equipment to closest facilities

### Government & Public Sector
- **Constituent Services**: Assign cases by geographic districts and voting precincts
- **Emergency Management**: Locate residents within disaster zones and evacuation areas
- **Social Services**: Connect citizens with nearby support resources
- **Infrastructure Planning**: Analyze population density for public works projects
- **Law Enforcement**: Coordinate response teams based on incident proximity

### Education & Academia
- **Student Services**: Connect students with nearby academic support resources
- **Alumni Relations**: Organize regional events and networking opportunities
- **Research Coordination**: Identify research participants within geographic parameters
- **Campus Safety**: Emergency notification systems based on location data

### Nonprofit & Community Organizations
- **Volunteer Coordination**: Match volunteers with nearby service opportunities
- **Donor Engagement**: Organize fundraising events by geographic regions
- **Program Delivery**: Optimize service distribution across communities
- **Outreach Management**: Prioritize community engagement based on proximity

### Real Estate & Property Management
- **Property Matching**: Connect clients with properties in preferred areas
- **Market Analysis**: Analyze buyer/seller distribution across territories
- **Service Provider Networks**: Route inspectors, appraisers, and contractors
- **Community Development**: Identify stakeholders within development zones

### Financial Services
- **Branch Optimization**: Analyze customer distribution for location planning
- **Advisor Assignment**: Connect clients with nearby financial advisors
- **Risk Assessment**: Evaluate geographic concentration of portfolios
- **Compliance Monitoring**: Ensure regulatory coverage across territories

### Transportation & Logistics
- **Route Optimization**: Plan delivery schedules based on customer proximity
- **Fleet Management**: Assign vehicles to minimize travel distances
- **Supply Chain**: Coordinate distribution centers and suppliers
- **Customer Pickup**: Schedule pickups based on geographic efficiency

### Event Management & Hospitality
- **Attendee Management**: Coordinate participants by geographic regions
- **Vendor Coordination**: Source local suppliers and service providers
- **Accommodation Planning**: Optimize lodging assignments for large events
- **Emergency Protocols**: Locate attendees during safety incidents

### Manufacturing & Industrial
- **Supplier Management**: Optimize vendor relationships based on proximity
- **Quality Control**: Route inspectors to facilities efficiently
- **Distribution Networks**: Analyze optimal shipping and receiving locations
- **Workforce Management**: Coordinate field teams across multiple sites

## Code Quality

### Performance Features
- **Cacheable Apex Methods**: Optimized data retrieval with proper caching
- **Debounced Search**: Prevents excessive API calls during user input
- **Efficient SOQL**: Query optimization with appropriate LIMIT clauses
- **Pagination Strategy**: Server-side pagination for large datasets

### Security Implementation
- **Field-Level Security**: Validates user access to all required fields
- **Object Permissions**: Checks read/write access before operations
- **Input Sanitization**: Protects against malicious input data
- **Exception Handling**: Comprehensive error management with user feedback

### Mobile Optimization
- **Responsive Design**: SLDS-compliant adaptive layouts
- **Touch-Friendly**: Optimized button sizes and spacing for mobile
- **Performance**: Efficient rendering on lower-powered devices

## Browser Support

| Browser | Desktop | Mobile |
|---------|---------|--------|
| Chrome  | ✅ | ✅ |
| Firefox | ✅ | ✅ |
| Safari  | ✅ | ✅ |
| Edge    | ✅ | ✅ |

## API Documentation

### Main Apex Methods

#### `getContactCount(searchBySelection, name, stateCode, distance, caseId)`
Returns total count of contacts matching search criteria.

**Parameters:**
- `searchBySelection` (String): Search type ('name', 'state', 'distance')
- `name` (String): Contact name for name-based search
- `stateCode` (String): State code for territory search
- `distance` (String): Radius in miles for distance search
- `caseId` (Id): Case ID for distance calculations

**Returns:** `Integer` - Total matching contacts

#### `assignContactToCase(contactId, caseId)`
Assigns a contact to a case and returns success message.

**Parameters:**
- `contactId` (String): ID of contact to assign
- `caseId` (String): ID of case to update

**Returns:** `String` - Success message with contact details

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow Salesforce coding standards
- Include unit tests for new functionality
- Update documentation for API changes
- Test on multiple screen sizes and browsers

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

**Project Author**: David Elias
**LinkedIn**: [Your LinkedIn Profile](https://www.linkedin.com/in/david-j-elias/)

## Acknowledgments

- Salesforce Lightning Design System for UI components
- Salesforce developer community for best practices
- Open source geospatial calculation algorithms

---

**⭐ If this project helped you, please consider giving it a star!**
