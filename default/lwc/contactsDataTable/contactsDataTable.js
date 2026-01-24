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
    // Constants
    SEARCH_DELAY = 500;
    MOBILE_BREAKPOINT = 768;
    PAGE_SIZE = 50;
    MODAL_CLOSE_DELAY = 1500;

    // Search and filter state
    searchTimeout;
    selectedRow = null;
    searchBySelection = 'name';
    selectedState = '';
    searchRadiusSelection = '';
    searchName = '';
    customRadiusValue = '';

    // UI state
    isLoading = false;
    showName = true;
    showState = false;
    showDistance = false;
    customRadius = false;
    isMobileDevice = false;

    // Data
    contacts = [];
    errorMsg = '';

    // Pagination
    @track pageNumber = 1;
    @track totalRecords = 0;
    @track totalPages = 1;

    // Record ID
    _recordId;

    @api
    get recordId() {
        return this._recordId;
    }
    set recordId(value) {
        this._recordId = value;
    }

    // Options
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
            label: 'Distance (mi)', 
            fieldName: 'DistanceFromCase', 
            type: 'number',
            typeAttributes: { minimumFractionDigits: 1, maximumFractionDigits: 1 }
        }
    ];

    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (currentPageReference) {
            this._recordId = currentPageReference.attributes?.recordId ||
                currentPageReference.state?.recordId;
        }
    }

    connectedCallback() {
        this.detectMobile();
        window.addEventListener('resize', this.handleResize);
    }

    disconnectedCallback() {
        window.removeEventListener('resize', this.handleResize);
        this.clearSearchTimeout();
    }

    handleResize = () => {
        this.detectMobile();
    }

    detectMobile() {
        this.isMobileDevice = window.innerWidth <= this.MOBILE_BREAKPOINT;
    }

    clearSearchTimeout() {
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = null;
        }
    }

    // Getters
    get isPhone() {
        return this.isMobileDevice;
    }

    get isLastPage() {
        return this.pageNumber >= this.totalPages;
    }

    get isFirstPage() {
        return this.pageNumber <= 1;
    }

    get hasContacts() {
        return this.contacts?.length > 0;
    }

    get buttonDisabled() {
        return this.selectedRow === null;
    }

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

    // Event Handlers
    handleSearchByChange(event) {
        this.selectedRow = null;
        this.pageNumber = 1;
        this.contacts = [];
        this.errorMsg = '';
        this.searchBySelection = event?.detail?.value;

        this.resetVisibilityFlags();
        this.updateVisibilityForSearchType();
    }

    resetVisibilityFlags() {
        this.showName = false;
        this.showState = false;
        this.showDistance = false;
        this.customRadius = false;
    }

    updateVisibilityForSearchType() {
        switch (this.searchBySelection) {
            case 'name':
                this.showName = true;
                break;
            case 'state':
                this.showState = true;
                break;
            case 'distance':
                this.showDistance = true;
                break;
            default:
                break;
        }
    }

    handleSearchRadiusChange(event) {
        this.searchRadiusSelection = event?.detail?.value;

        if (this.searchRadiusSelection === 'custom') {
            this.customRadius = true;
            this.errorMsg = '';
        } else {
            this.customRadius = false;
            this.customRadiusValue = '';
            this.errorMsg = '';

            if (this.recordId && this.searchRadiusSelection) {
                this.loadPage();
            }
        }
    }

    handleCustomRadiusChange(event) {
        this.customRadiusValue = event?.target?.value;
        this.clearSearchTimeout();

        this.searchTimeout = setTimeout(() => {
            const radiusValue = parseFloat(this.customRadiusValue);
            if (radiusValue && radiusValue > 0 && this.recordId) {
                this.loadPage();
            }
        }, this.SEARCH_DELAY);
    }

    handleSearchNameChange(event) {
        this.searchName = event?.target?.value;
        this.clearSearchTimeout();

        if (this.searchName && this.searchName.trim().length > 0) {
            this.searchTimeout = setTimeout(() => {
                this.loadPage();
            }, this.SEARCH_DELAY);
        } else {
            this.clearSearchResults();
        }
    }

    clearSearchResults() {
        this.contacts = [];
        this.errorMsg = '';
        this.totalRecords = 0;
        this.totalPages = 1;
    }

    handleStateChange(event) {
        this.selectedState = event?.detail?.value;
        this.resetToFirstPage();
        this.loadPage();
    }

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

    handleRowSelection(event) {
        this.selectedRow = event.detail.config.value;
    }

    handleCancel() {
        this.dispatchEvent(new CloseActionScreenEvent());
    }

    async handleAssignment() {
        if (!this.validateSelection()) {
            return;
        }

        await this.executeAssignment();
    }

    // Helper Methods
    resetToFirstPage() {
        this.pageNumber = 1;
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
            this.handleError(error, 'Error loading page');
        } finally {
            this.isLoading = false;
        }
    }

    async getContactsForName() {
        try {
            const data = await getContactsByName({
                name: this.searchName,
                pageSize: this.PAGE_SIZE,
                pageNumber: this.pageNumber
            });

            this.contacts = this.mapContactData(data);
            this.createErrorMessage(this.contacts.length);
        } catch (error) {
            this.handleError(error, 'Error loading contacts by name');
            this.contacts = [];
        }
    }

    async getContactsForState() {
        try {
            const data = await getContactsByAccountState({
                stateCode: this.selectedState,
                pageSize: this.PAGE_SIZE,
                pageNumber: this.pageNumber
            });

            this.contacts = this.mapContactData(data);
            this.createErrorMessage(this.contacts.length);
        } catch (error) {
            this.handleError(error, 'Error loading contacts by state');
            this.contacts = [];
        }
    }

    async getContactsForDistance() {
        try {
            const radiusValue = this.getRadiusValue();

            if (!this.validateDistanceSearch(radiusValue)) {
                return;
            }

            const data = await getContactsByAccountDistance({
                caseId: this.recordId,
                radius: radiusValue,
                pageSize: this.PAGE_SIZE,
                pageNumber: this.pageNumber
            });

            this.contacts = data || [];
            this.createErrorMessage(this.contacts.length);
        } catch (error) {
            this.contacts = [];
            this.errorMsg = 'Error loading contacts: ' + this.getErrorMessage(error);
        }
    }

    getRadiusValue() {
        return this.customRadius 
            ? parseFloat(this.customRadiusValue) 
            : parseFloat(this.searchRadiusSelection);
    }

    validateDistanceSearch(radiusValue) {
        if (!radiusValue || radiusValue <= 0) {
            this.contacts = [];
            this.errorMsg = 'Please enter a valid distance value';
            return false;
        }

        if (!this.recordId) {
            this.contacts = [];
            this.errorMsg = 'Case ID not available for distance search';
            return false;
        }

        return true;
    }

    mapContactData(data) {
        return (data || []).map(contact => ({
            ...contact,
            AccountName: contact.Account?.Name || '',
            AccountStateCode: contact.Account?.BillingStateCode || 
                             contact.Account?.BillingState || ''
        }));
    }

    createErrorMessage(numOfContacts) {
        if (numOfContacts === 0) {
            switch (this.searchBySelection) {
                case 'name':
                    if (this.searchName.length > 0) {
                        this.errorMsg = `No contacts found for the entered name: ${this.searchName}`;
                    }
                    break;
                case 'state':
                    this.errorMsg = `No contacts found for the selected state: ${this.selectedState}`;
                    break;
                case 'distance':
                    const displayRadius = this.customRadius ? this.customRadiusValue : this.searchRadiusSelection;
                    this.errorMsg = `No contacts found within ${displayRadius} miles of the case location`;
                    break;
                default:
                    this.errorMsg = '';
            }
        } else {
            this.errorMsg = '';
        }
    }

    async loadTotalCount() {
        if (!this.searchBySelection) {
            this.resetPaginationData();
            return;
        }

        const params = this.buildCountParameters();
        
        if (!params) {
            this.resetPaginationData();
            return;
        }

        try {
            const result = await getContactCount(params);
            this.totalRecords = (result !== null && result !== undefined && !isNaN(result)) ? result : 0;
            this.totalPages = Math.ceil(this.totalRecords / this.PAGE_SIZE) || 1;
        } catch (error) {
            this.resetPaginationData();
            this.errorMsg = 'Error loading contact count: ' + this.getErrorMessage(error);
        }
    }

    buildCountParameters() {
        const params = {
            searchBySelection: this.searchBySelection,
            name: '',
            stateCode: '',
            distance: '',
            caseId: this.recordId
        };

        switch (this.searchBySelection) {
            case 'name':
                if (!this.searchName || this.searchName.trim() === '') {
                    return null;
                }
                params.name = this.searchName.trim();
                break;

            case 'state':
                if (!this.selectedState || this.selectedState.trim() === '') {
                    return null;
                }
                params.stateCode = this.selectedState.trim();
                break;

            case 'distance':
                const radiusValue = this.getRadiusValue();
                if (!radiusValue || radiusValue <= 0 || !this.recordId) {
                    return null;
                }
                params.distance = radiusValue.toString();
                break;

            default:
                return null;
        }

        return params;
    }

    resetPaginationData() {
        this.totalRecords = 0;
        this.totalPages = 1;
    }

    // Assignment Methods
    validateSelection() {
        if (!this.selectedRow) {
            this.showToast('Warning', 'Please select a contact to assign to this case', 'warning');
            return false;
        }
        return true;
    }

    async executeAssignment() {
        this.isLoading = true;

        try {
            const result = await assignContactToCase({
                contactId: this.selectedRow,
                caseId: this.recordId
            });

            this.showToast('Success', result || 'Contact assigned successfully!', 'success');
            this.refreshAndClose();
        } catch (error) {
            const errorMessage = this.getErrorMessage(error);
            this.showToast('Error', 'Failed to assign contact: ' + errorMessage, 'error');
        } finally {
            this.isLoading = false;
        }
    }

    refreshAndClose() {
        this.dispatchEvent(new RefreshEvent());
        
        setTimeout(() => {
            this.dispatchEvent(new CloseActionScreenEvent());
        }, this.MODAL_CLOSE_DELAY);
    }

    // Error Handling
    handleError(error, context) {
        console.error(`${context}:`, error);
    }

    getErrorMessage(error) {
        return error.body?.message || error.message || 'Unknown error occurred';
    }

    // Toast Notifications
    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            title,
            message,
            variant,
            mode: 'dismissable'
        });
        this.dispatchEvent(event);
    }
}
