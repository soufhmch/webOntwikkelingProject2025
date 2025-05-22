document.addEventListener('DOMContentLoaded', () => {
    // ====================
    // Elementverwijzingen
    // ====================
    const searchInput = document.getElementById('searchInput');
    const brandFilter = document.getElementById('brandFilter');
    const typeFilter = document.getElementById('typeFilter');
    const priceFilter = document.getElementById('priceFilter');
    const watchTable = document.getElementById('watchTable');
    const filterButtons = document.querySelectorAll('.filter-button');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const registerModal = document.getElementById('registerModal');
    const closeRegister = document.getElementById('closeRegister');

    // ====================
    // Validatie DOM
    // ====================
    if (!searchInput || !brandFilter || !typeFilter || !priceFilter || !watchTable) {
        console.error('Essentiële elementen ontbreken in de DOM');
        return;
    }

    // ====================
    // Filterfunctie
    // ====================
    const applyFilters = () => {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const selectedBrand = brandFilter.value.toLowerCase();
        const selectedType = typeFilter.value.toLowerCase();
        const selectedPrice = priceFilter.value;

        Array.from(watchTable.querySelectorAll('tr')).forEach(row => {
            const nameCell = row.querySelector('td:first-child');
            const brandCell = row.querySelector('td:nth-child(2)');
            const priceCell = row.querySelector('td:nth-child(3)');
            const typeCell = row.querySelector('td:nth-child(4)');

            if (!nameCell || !brandCell || !priceCell || !typeCell) return;

            const name = nameCell.querySelector('.font-semibold')?.textContent?.toLowerCase() || '';
            const description = nameCell.querySelector('.text-sm')?.textContent?.toLowerCase() || '';
            const brand = brandCell.textContent?.toLowerCase() || '';
            const type = typeCell.textContent?.toLowerCase() || '';
            const price = parseFloat(
                priceCell.textContent.replace('€', '').replace(/\./g, '').replace(',', '.')
            ) || 0;

            const matchesSearch =
                !searchTerm || name.includes(searchTerm) || brand.includes(searchTerm) || description.includes(searchTerm);
            const matchesBrand = selectedBrand === 'alle merken' || brand.includes(selectedBrand);
            const matchesType = selectedType === 'alle typen' || type.includes(selectedType);
            const matchesPrice = isPriceInRange(price, selectedPrice);

            row.style.display = matchesSearch && matchesBrand && matchesType && matchesPrice
                ? 'table-row'
                : 'none';
        });
    };

    // ====================
    // Hulp: Prijsfilter
    // ====================
    const isPriceInRange = (price, range) => {
        switch (range) {
            case 'Onder €500':
                return price < 500;
            case '€500 - €2000':
                return price >= 500 && price <= 2000;
            case '€2000 - €5000':
                return price >= 2000 && price <= 5000;
            case '€5000 - €7500':
                return price >= 5000 && price <= 7500;
            case '€7500 - €10000':
                return price >= 7500 && price <= 10000;
            case 'Boven €10000':
                return price > 10000;
            default:
                return true;
        }
    };

    // ====================
    // Event Listeners
    // ====================
    searchInput.addEventListener('input', applyFilters);
    searchInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') applyFilters();
    });

    [brandFilter, typeFilter, priceFilter].forEach(filter => {
        filter.addEventListener('change', applyFilters);
    });

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const filterValue = button.dataset.filter?.toLowerCase();
            if (filterValue) applyFilters();
        });
    });

    // ====================
    // Mobiel menu toggle
    // ====================
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // ====================
    // Register modal logica
    // ====================
    const urlParams = new URLSearchParams(window.location.search);
    if (registerModal && closeRegister && urlParams.has('showRegister')) {
        registerModal.classList.remove('hidden');

        closeRegister.addEventListener('click', () => {
            registerModal.classList.add('hidden');
            window.history.replaceState({}, document.title, window.location.pathname);
        });
    }

    // ====================
    // Initiale filtertoepassing
    // ====================
    applyFilters();
});
