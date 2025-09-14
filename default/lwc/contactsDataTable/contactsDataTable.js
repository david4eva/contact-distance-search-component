import { wire, track, api } from 'lwc';
import LightningModal from 'lightning/modal';
import { CurrentPageReference } from 'lightning/navigation';
import { CloseActionScreenEvent } from "lightning/actions";
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { RefreshEvent } from 'lightning/refresh';
import getContactsByName from '@salesforce/apex/ContactsByNameController.getContactsByName';
import getContactCount from '@salesforce/apex/ContactsPaginationController.getContactCount';
import getContactsByAccountState from '@salesforce/apex/ContactsByStateController.getContactsByAccountState';
import getContactsByAccountDistance from '@salesforce/apex/ContactsByDistanceController.getContactsByAccountDistance';
import assignContactToCase from '@salesforce/apex/CaseAssignmentController.assignContactToCase';

export default class ContactsStateModal extends LightningModal {
    searchTimeout;
    SEARCH_DELAY = 500; // 500ms delay for API calls only
    selectedRow = null;
    searchBySelection = 'name'; // Default to 'name'
    selectedState = '';
    searchRadiusSelection = '';
    isLoading = false;
    searchName = '';
    showName = true;
    showState = false;
    showDistance = false;
    customRadius = false;
    customRadiusValue = '';
    contacts = [];
    pageSize = 50;
    @track pageNumber = 1;
    @track totalRecords = 0;
    @track totalPages = 1;
    errorMsg = '';
    _recordId;

    @api
    get recordId() {
        return this._recordId;
    }
    set recordId(value) {
        this._recordId = value;
    }

    searchByOptions = [
        { label: 'Name', value: 'name' },
        { label: 'State', value: 'state' },
        { label: 'Distance', value: 'distance' }
    ];

    distanceOptions = [
        { label: '5 miles', value: '5' },
        { label: '10 miles', value: '10' },
        { label: '15 miles', value: '15' },
        { label: '25 miles', value: '25' },
        { label: '50 miles', value: '50' },
        { label: '75 miles', value: '75' },
        { label: '100 miles', value: '100' },
        { label: '150 miles', value: '150' },
        { label: '200 miles', value: '200' },
        { label: 'Custom distance', value: 'custom' }
    ];

    stateOptions = [
        { label: 'Alabama', value: 'AL' }, { label: 'Alaska', value: 'AK' },
        { label: 'Arizona', value: 'AZ' }, { label: 'Arkansas', value: 'AR' },
        { label: 'California', value: 'CA' }, { label: 'Colorado', value: 'CO' },
        { label: 'Connecticut', value: 'CT' }, { label: 'Delaware', value: 'DE' },
        { label: 'District of Columbia', value: 'DC' }, { label: 'Florida', value: 'FL' },
        { label: 'Georgia', value: 'GA' }, { label: 'Hawaii', value: 'HI' },
        { label: 'Idaho', value: 'ID' }, { label: 'Illinois', value: 'IL' },
        { label: 'Indiana', value: 'IN' }, { label: 'Iowa', value: 'IA' },
        { label: 'Kansas', value: 'KS' }, { label: 'Kentucky', value: 'KY' },
        { label: 'Louisiana', value: 'LA' }, { label: 'Maine', value: 'ME' },
        { label: 'Maryland', value: 'MD' }, { label: 'Massachusetts', value: 'MA' },
        { label: 'Michigan', value: 'MI' }, { label: 'Minnesota', value: 'MN' },
        { label: 'Mississippi', value: 'MS' }, { label: 'Missouri', value: 'MO' },
        { label: 'Montana', value: 'MT' }, { label: 'Nebraska', value: 'NE' },
        { label: 'Nevada', value: 'NV' }, { label: 'New Hampshire', value: 'NH' },
        { label: 'New Jersey', value: 'NJ' }, { label: 'New Mexico', value: 'NM' },
        { label: 'New York', value: 'NY' }, { label: 'North Carolina', value: 'NC' },
        { label: 'North Dakota', value: 'ND' }, { label: 'Ohio', value: 'OH' },
        { label: 'Oklahoma', value: 'OK' }, { label: 'Oregon', value: 'OR' },
        { label: 'Pennsylvania', value: 'PA' }, { label: 'Rhode Island', value: 'RI' },
        { label: 'South Carolina', value: 'SC' }, { label: 'South Dakota', value: 'SD' },
        { label: 'Tennessee', value: 'TN' }, { label: 'Texas', value: 'TX' },
        { label: 'Utah', value: 'UT' }, { label: 'Vermont', value: 'VT' },
        { label: 'Virginia', value: 'VA' }, { label: 'Washington', value: 'WA' },
        { label: 'West Virginia', value: 'WV' }, { label: 'Wisconsin', value: 'WI' },
        { label: 'Wyoming', value: 'WY' }
    ];

    columns = [
        { label: 'Name', fieldName: 'Name' },
        { label: 'Account', fieldName: 'AccountName' },
        { label: 'Email', fieldName: 'Email', type: 'email' },
        { label: 'Phone', fieldName: 'Phone', type: 'phone' },
        { label: 'State', fieldName: 'AccountStateCode' }
    ];

    columnsWithDistance = [
        { label: 'Name', fieldName: 'Name' },
        { label: 'Account', fieldName: 'AccountName' },
        { label: 'Email', fieldName: 'Email', type: 'email' },
        { label: 'Phone', fieldName: 'Phone', type: 'phone' },
        { label: 'State', fieldName: 'AccountStateCode' },
        {
            label: 'Distance (mi)', fieldName: 'DistanceFromCase', type: 'number',
            typeAttributes: { minimumFractionDigits: 1, maximumFractionDigits: 1 }
        }
    ];

    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (currentPageReference) {
            // Try to get recordId from page reference
            this._recordId = currentPageReference.attributes?.recordId ||
                currentPageReference.state?.recordId;
        }
    }

    connectedCallback() {
        // Initialize mobile detection
        this.detectMobile();
        window.addEventListener('resize', this.detectMobile.bind(this));
    }

    disconnectedCallback() {
        // Clean up event listener
        window.removeEventListener('resize', this.detectMobile.bind(this));

        // Clean up timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
    }

    detectMobile() {
        // Simple mobile detection based on screen width
        this.isMobileDevice = window.innerWidth <= 768;
    }

    // Getter for mobile detection
    get isPhone() {
        return this.isMobileDevice || false;
    }

    // Getter to check if we're on the last page
    get isLastPage() {
        return this.pageNumber >= this.totalPages;
    }

    // Getter to check if we're on the first page
    get isFirstPage() {
        return this.pageNumber <= 1;
    }

    // Handler for the "Search by State or Distance" combobox
    handleSearchByChange(event) {
        // Update UI immediately
        this.selectedRow = null; // Clear selected row on search type change
        this.pageNumber = 1;  // Reset page number when changing search type
        this.contacts = [];  // Clear current contacts
        this.searchBySelection = event?.detail?.value;

        // Update visibility flags immediately
        switch (this.searchBySelection) {
            case 'name':
                this.showName = true;
                this.showDistance = false
                this.showState = false;
                this.customRadius = false;
                break;

            case 'state':
                this.showName = false;
                this.showState = true;
                this.showDistance = false;
                this.searchRadius = false;
                this.customRadius = false;
                break;

            case 'distance':
                this.showName = false;
                this.showState = false;
                this.showDistance = true;
                this.columns = this.columnsWithDistance;
                break;

            default:
                break;
        }

        // No need to load page here - user will select criteria first
    }

    handleSearchRadiusChange(event) {
        // Update UI immediately
        this.searchRadiusSelection = event?.detail?.value;

        if (this.searchRadiusSelection === 'custom') {
            // Show custom radius input immediately
            this.customRadius = true;
            this.errorMsg = '';
            // Don't trigger search yet - wait for custom value
        } else {
            // Hide custom radius input and use preset value immediately
            this.customRadius = false;
            this.customRadiusValue = ''; // Clear custom value
            this.errorMsg = '';

            // Only load if we have recordId and a valid radius
            if (this.recordId && this.searchRadiusSelection) {
                this.loadPage();
            }
        }
    }

    handleCustomRadiusChange(event) {
        // Update UI immediately - no debouncing on typing
        this.customRadiusValue = event?.target?.value;

        // Clear any existing timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        // Debounce only the API call
        this.searchTimeout = setTimeout(() => {
            const radiusValue = parseFloat(this.customRadiusValue);
            if (radiusValue && radiusValue > 0 && this.recordId) {
                this.loadPage();
            }
        }, this.SEARCH_DELAY);
    }

    waitForQuietPeriod(expectedCounter, delay) {
        return new Promise(resolve => {
            const startTime = Date.now();

            const checkQuiet = () => {
                if (this.debounceCounter !== expectedCounter) {
                    // New input detected, resolve immediately
                    resolve();
                } else if (Date.now() - startTime >= delay) {
                    // Delay period completed
                    resolve();
                } else {
                    // Continue waiting using Promise microtask
                    Promise.resolve().then(checkQuiet);
                }
            };

            checkQuiet();
        });
    }

    handleSearchNameChange(event) {
        // Update UI immediately - no debouncing on typing
        this.searchName = event?.target?.value;

        // Clear any existing timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        // Only search if there's actually a name to search for
        if (this.searchName && this.searchName.trim().length > 0) {
            // Debounce only the API call
            this.searchTimeout = setTimeout(() => {
                this.loadPage();
            }, this.SEARCH_DELAY);
        } else {
            // Clear contacts immediately if search field is empty
            this.contacts = [];
            this.errorMsg = '';
            this.totalRecords = 0;
            this.totalPages = 1;
        }
    }

    waitForSearchQuiet(expectedCounter, delay) {
        return new Promise(resolve => {
            const startTime = Date.now();

            const checkQuiet = () => {
                if (this.searchNameCounter !== expectedCounter) {
                    // New search input detected, resolve immediately
                    resolve();
                } else if (Date.now() - startTime >= delay) {
                    // Delay period completed
                    resolve();
                } else {
                    // Continue waiting using Promise microtask
                    Promise.resolve().then(checkQuiet);
                }
            };

            checkQuiet();
        });
    }

    handleStateChange(event) {
        // Update UI immediately
        this.selectedState = event?.detail?.value;
        this.resetToFirstPage(); // Reset to first page when changing state

        // Load immediately for dropdowns (no debouncing needed)
        this.loadPage();
    }

    // Reset datatable records to first page
    resetToFirstPage() {
        this.pageNumber = 1; // Reset to first page when changing state
    }

    async loadPage() {
        this.isLoading = true;

        try {
            switch (this.searchBySelection) {
                case 'name':
                    await Promise.all([
                        this.getContactsForName(),
                        this.loadTotalCount()
                    ]);
                    break;

                case 'state':
                    await Promise.all([
                        this.getContactsForState(),
                        this.loadTotalCount()
                    ]);
                    break;

                case 'distance':
                    await Promise.all([
                        this.getContactsForDistance(),
                        this.loadTotalCount()
                    ]);
                    break;

                default:
                    break;
            }
        } catch (error) {
            console.error('Error in loadPage:', error);
        } finally {
            this.isLoading = false; // ALWAYS set to false here
        }
    }

    async getContactsForName() {
        try {
            const data = await getContactsByName({
                name: this.searchName,
                pageSize: this.pageSize,
                pageNumber: this.pageNumber
            });

            this.contacts = (data || []).map(c => ({
                ...c,
                AccountName: c.Account?.Name || '',
                AccountStateCode: c.Account?.BillingStateCode || c.Account?.BillingState || ''
            }));
            this.createErrorMessage(this.contacts.length);
        } catch (e) {
            console.error('Error loading contacts:', e);
            this.contacts = [];
        }
    }

    async getContactsForState() {
        try {
            const data = await getContactsByAccountState({
                stateCode: this.selectedState,
                pageSize: this.pageSize,
                pageNumber: this.pageNumber
            });
            this.contacts = (data || []).map(c => ({
                ...c,
                AccountName: c.Account?.Name || '',
                AccountStateCode: c.Account?.BillingStateCode || c.Account?.BillingState || ''
            }));
            this.createErrorMessage(this.contacts.length);
        } catch (e) {
            console.error('Error loading contacts:', e);
            this.contacts = [];
        }
    }

    async getContactsForDistance() {
        try {
            // Determine radius value with better validation
            let radiusValue;

            if (this.customRadius) {
                radiusValue = parseFloat(this.customRadiusValue);
            } else {
                radiusValue = parseFloat(this.searchRadiusSelection);
            }

            // Better validation
            if (!radiusValue || radiusValue <= 0) {
                this.contacts = [];
                this.errorMsg = 'Please enter a valid distance value';
                return;
            }

            if (!this.recordId) {
                this.contacts = [];
                this.errorMsg = 'Case ID not available for distance search';
                return;
            }

            const data = await getContactsByAccountDistance({
                caseId: this.recordId,
                radius: radiusValue,
                pageSize: this.pageSize,
                pageNumber: this.pageNumber
            });
            this.contacts = data || [];

            // Update error message for custom radius too
            this.createErrorMessage(this.contacts.length);
        } catch (e) {
            this.contacts = [];
            this.errorMsg = 'Error loading contacts: ' + (e.body?.message || e.message);
        }
    }

    createErrorMessage(numOfContacts) {
        if (numOfContacts === 0 && this.searchBySelection === 'name' && this.searchName.length > 0) {
            this.errorMsg = `No contacts found for the entered name: ${this.searchName}`;
        } else if (numOfContacts === 0 && this.searchBySelection === 'state') {
            this.errorMsg = `No contacts found for the selected state: ${this.selectedState}`;
        } else if (numOfContacts === 0 && this.searchBySelection === 'distance') {
            const displayRadius = this.customRadius ? this.customRadiusValue : this.searchRadiusSelection;
            this.errorMsg = `No contacts found within ${displayRadius} miles of the case location`;
        } else {
            this.errorMsg = '';
        }
    }

    // Load total count of contacts based on current filter
    async loadTotalCount() {
        // Early exit if no search type selected
        if (!this.searchBySelection) {
            this.totalRecords = 0;
            this.totalPages = 1;
            return;
        }

        // Prepare parameters
        let searchBySelection = this.searchBySelection;
        let name = '';
        let stateCode = '';
        let distance = '';
        let caseId = this.recordId;

        // Set parameters based on search type
        if (this.searchBySelection === 'name') {
            if (!this.searchName || this.searchName.trim() === '') {
                this.totalRecords = 0;
                this.totalPages = 1;
                return;
            }
            name = this.searchName.trim();
        }
        else if (this.searchBySelection === 'state') {
            if (!this.selectedState || this.selectedState.trim() === '') {
                this.totalRecords = 0;
                this.totalPages = 1;
                return;
            }
            stateCode = this.selectedState.trim();
        }
        else if (this.searchBySelection === 'distance') {
            let radiusValue;
            if (this.customRadius) {
                radiusValue = parseFloat(this.customRadiusValue);
            } else {
                radiusValue = parseFloat(this.searchRadiusSelection);
            }

            if (!radiusValue || radiusValue <= 0 || !this.recordId) {
                this.totalRecords = 0;
                this.totalPages = 1;
                return;
            }
            distance = radiusValue.toString();
        }

        try {
            // Call with individual parameters instead of wrapper object
            const result = await getContactCount({
                searchBySelection: searchBySelection,
                name: name,
                stateCode: stateCode,
                distance: distance,
                caseId: caseId
            });
            // Ensure we have a valid number
            this.totalRecords = (result !== null && result !== undefined && !isNaN(result)) ? result : 0;
            // Compute total pages
            this.totalPages = Math.ceil(this.totalRecords / this.pageSize) || 1;
        } catch (error) {
            this.totalRecords = 0;
            this.totalPages = 1;
            this.errorMsg = 'Error loading contact count: ' + (error.body?.message || error.message);
        }
    }

    // Pagination handlers
    handlePrev() {
        if (this.pageNumber > 1) {
            this.pageNumber--;
            this.loadPage();
        }
    }

    handleNext() {
        if (this.pageNumber < this.totalPages) {
            this.pageNumber++;
            this.loadPage();
        }
    }

    get hasContacts() {
        return this.contacts?.length > 0;
    }

    // Disabled button if on last page or no row selected
    get buttonDisabled() {
        return this.selectedRow === null;
    }

    // Replace the columns property with a getter
    get currentColumns() {
        return this.searchBySelection === 'distance' ? this.columnsWithDistance : this.columns;
    }

    get displayTotalRecords() {
        return this.totalRecords || 0;
    }

    get displayTotalPages() {
        return this.totalPages || 1;
    }

    get displayPageNumber() {
        return this.pageNumber || 1;
    }

    get assignmentDisabled() {
        return this.selectedRow === null;
    }

    handleRowSelection(event) {
        this.selectedRow = event.detail.config.value; // Store selected row's recordId
    }

    handleCancel() {
        // Dispatch the close action event
        this.dispatchEvent(new CloseActionScreenEvent());
    }

    async handleAssignment() {
        console.log('🎯 handleAssignment called');
        console.log('selectedRow:', this.selectedRow);
        console.log('recordId:', this.recordId);

        // Validate that a contact is selected
        if (!this.selectedRow) {
            console.log('❌ No contact selected - showing warning toast');
            this.showToast('Warning', 'Please select a contact to assign to this case', 'warning');
            return;
        }

        console.log('✅ Validation passed - proceeding with assignment');

        // Set loading state
        this.isLoading = true;

        try {
            console.log('📡 Calling assignContactToCase Apex method...');

            // Call Apex method to assign contact to case
            const result = await assignContactToCase({
                contactId: this.selectedRow,
                caseId: this.recordId
            });

            console.log('✅ Apex method completed successfully');
            console.log('Result from Apex:', result);

            // Test if toast is working
            console.log('🍞 Attempting to show success toast...');
            this.showToast('Success', result || 'Contact assigned successfully!', 'success');
            console.log('🍞 Toast event dispatched');

            // Try alternative refresh approaches
            console.log('🔄 Attempting to refresh page...');

            // Method 1: RefreshEvent (Lightning Experience)
            try {
                this.dispatchEvent(new RefreshEvent());
                console.log('✅ RefreshEvent dispatched');
            } catch (refreshError) {
                console.error('❌ RefreshEvent failed:', refreshError);
            }

            // Method 2: Alternative refresh using eval (fallback)
            try {
                // eslint-disable-next-line no-eval
                eval("$A.get('e.force:refreshView').fire();");
                console.log('✅ Legacy refresh fired');
            } catch (legacyError) {
                console.log('ℹ️ Legacy refresh not available (normal in LWC)');
            }

            // Method 3: Window refresh - ENABLED
            console.log('🔄 Scheduling window reload in 3 seconds...');
            setTimeout(() => {
                console.log('🌐 Performing window reload...');
                try {
                    if (window && window.location && window.location.reload) {
                        window.location.reload(true); // Force reload from server
                        console.log('✅ Window reload initiated');
                    } else {
                        console.error('❌ Window reload not available');
                    }
                } catch (reloadError) {
                    console.error('❌ Window reload failed:', reloadError);
                }
            }, 3000); // Wait 3 seconds to let user see the success message

            console.log('⏰ Waiting 2 seconds before closing modal...');

            // Close modal after delay (but before reload)
            setTimeout(() => {
                console.log('🚪 Closing modal...');
                try {
                    this.dispatchEvent(new CloseActionScreenEvent());
                    console.log('✅ Modal close event dispatched');
                } catch (closeError) {
                    console.error('❌ Modal close failed:', closeError);
                }
            }, 2000);

        } catch (error) {
            console.error('❌ Assignment failed');
            console.error('Error object:', error);
            console.error('Error message:', error.message);
            console.error('Error body:', error.body);
            console.error('Full error details:', JSON.stringify(error, null, 2));

            const errorMessage = error.body?.message || error.message || 'Unknown error occurred';
            console.log('🍞 Showing error toast:', errorMessage);

            this.showToast('Error', 'Failed to assign contact: ' + errorMessage, 'error');

            // Don't reload on error - let user try again
            console.log('❌ Error occurred - skipping page reload');

        } finally {
            console.log('🏁 Assignment process completed, resetting loading state');
            this.isLoading = false;
        }
    }

    /**
     * Enhanced toast method with debugging
     */
    showToast(title, message, variant) {
        console.log('🍞 showToast called with:', { title, message, variant });

        try {
            const evt = new ShowToastEvent({
                title: title,
                message: message,
                variant: variant,
                mode: 'dismissable',
                duration: 6000 // Longer duration to ensure visibility
            });

            console.log('🍞 ShowToastEvent created:', evt);
            this.dispatchEvent(evt);
            console.log('🍞 ShowToastEvent dispatched successfully');

        } catch (toastError) {
            console.error('❌ Toast failed:', toastError);

            // Fallback: log warning to console
            console.warn(`Toast failed: ${title}: ${message}`);
        }
    }
}