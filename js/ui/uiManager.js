// Управление пользовательским интерфейсом
class UIManager {
    constructor(classManager, conflictManager) {
        this.classManager = classManager;
        this.conflictManager = conflictManager;
        this.currentDay = null;
        this.selectedCell = null;
        this.editingScheduleId = null;
    }

    setupUI() {
        console.log('Настройка интерфейса');

        // Обработчики для кнопок дней недели
        document.querySelectorAll('.day-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectDay(e.target.dataset.day));
        });

        // Кнопки управления
        document.getElementById('addClassBtn')?.addEventListener('click', () => this.addClassTable());
        document.getElementById('downloadExcelBtn')?.addEventListener('click', () => this.downloadSchedule());
        document.getElementById('clearAllBtn')?.addEventListener('click', () => this.clearAll());

        // Настройка модальных окон
        this.setupModals();
        this.setupCombinedLessonDialog();
        this.setupClassroomManagementDialog();
    }

    setupModals() {
        // Закрытие модальных окон
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => this.closeModals());
        });

        // Закрытие по клику на фон
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModals();
                }
            });
        });

        // Поиск в модальных окнах
        const subjectSearch = document.getElementById('subjectSearch');
        if (subjectSearch) {
            subjectSearch.addEventListener('input', (e) => {
                this.filterItems(e.target.value, 'subjects');
            });
        }

        const classroomSearch = document.getElementById('classroomSearch');
        if (classroomSearch) {
            classroomSearch.addEventListener('input', (e) => {
                this.filterItems(e.target.value, 'classrooms');
            });
        }

        // Заполняем списки предметов и кабинетов
        this.populateSubjectList();
        this.populateClassroomList();
    }

    setupCombinedLessonDialog() {
        const dialogHTML = `
            <div id="combinedLessonDialog" class="modal hidden">
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h2>⚠️ Конфликт кабинета</h2>
                        <button class="modal-close" onclick="scheduleCreator.uiManager.closeCombinedDialog()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>Кабинет <strong><span id="conflictClassroom"></span></strong> уже занят в <strong><span id="conflictLesson"></span> урок</strong>.</p>
                        <div class="conflict-info">
                            <p><strong>Занято классом:</strong> <span id="conflictClass"></span></p>
                            <p><strong>Предмет:</strong> <span id="conflictSubject"></span></p>
                        </div>
                        <p>Это совмещенный урок?</p>
                        <div class="dialog-buttons">
                            <button id="combinedYesBtn" class="btn btn-primary">Да, совмещенный</button>
                            <button id="combinedNoBtn" class="btn btn-secondary">Нет, другой урок</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', dialogHTML);

        // Обработчики для диалога
        document.getElementById('combinedYesBtn')?.addEventListener('click', () => this.handleCombinedLesson(true));
        document.getElementById('combinedNoBtn')?.addEventListener('click', () => this.handleCombinedLesson(false));
    }

    setupClassroomManagementDialog() {
        const dialogHTML = `
            <div id="classroomManagementDialog" class="modal hidden">
                <div class="modal-content" style="max-width: 700px;">
                    <div class="modal-header">
                        <h2>Управление кабинетами</h2>
                        <button class="modal-close" onclick="scheduleCreator.uiManager.closeClassroomManagementDialog()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="current-classrooms" id="currentClassroomsList">
                            <p>Текущие кабинеты:</p>
                            <div id="classroomsContainer" class="classrooms-container">
                                <!-- Список кабинетов будет здесь -->
                            </div>
                        </div>
                        <div class="add-classroom-section">
                            <p>Добавить кабинет:</p>
                            <div class="classroom-search-container">
                                <input type="text" id="classroomManagementSearch"
                                       placeholder="Поиск кабинета..."
                                       class="search-input">
                                <div id="classroomManagementList" class="modal-items-list">
                                    <!-- Список доступных кабинетов -->
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', dialogHTML);

        // Обработчик поиска в модальном окне кабинетов
        const searchInput = document.getElementById('classroomManagementSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterClassroomsForManagement(e.target.value);
            });
        }
    }

    selectDay(day) {
        console.log('Выбран день:', day);

        // Убираем активный класс у всех кнопок
        document.querySelectorAll('.day-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Добавляем активный класс выбранной кнопке
        document.querySelector(`[data-day="${day}"]`).classList.add('active');

        // Устанавливаем текущий день
        this.currentDay = day;

        // Отображаем название дня
        const dayName = Constants.DAY_NAMES[day];
        document.getElementById('selectedDayTitle').textContent = `Расписание на ${dayName}`;

        // Показываем область расписания
        const scheduleArea = document.getElementById('scheduleArea');
        if (scheduleArea) {
            scheduleArea.classList.remove('hidden');
        }

        // Если это новое расписание, добавляем первый класс
        if (!this.editingScheduleId && this.classManager.classes.length === 0) {
            this.addClassTable();
        }

        // Очищаем конфликты при смене дня
        this.conflictManager.clearConflicts();
    }

    addClassTable(classData = null) {
        const classObj = this.classManager.addClass(classData);
        this.renderClassTable(classObj);
        this.updateDownloadButton();
    }

    renderClassTable(classObj) {
        const container = document.getElementById('classesContainer');
        if (!container) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'class-table-wrapper';
        wrapper.dataset.classId = classObj.id;

        wrapper.innerHTML = this.generateClassTableHTML(classObj);
        container.appendChild(wrapper);
    }

    generateClassTableHTML(classObj) {
        return `
            <div class="class-header">
                <input type="text" class="class-input"
                       value="${Constants.escapeHtml(classObj.name)}"
                       placeholder="Введите класс (например: 5А)"
                       oninput="scheduleCreator.uiManager.updateClassName('${classObj.id}', this.value)">
                <button class="delete-class-btn"
                        onclick="scheduleCreator.uiManager.deleteClass('${classObj.id}')">×</button>
            </div>
            <table class="schedule-table">
                <thead>
                    <tr>
                        <th>№</th>
                        <th>Предмет</th>
                        <th>Кабинеты</th>
                        <th style="width: 30px;"></th>
                    </tr>
                </thead>
                <tbody id="lessons-${classObj.id}">
                    ${this.renderLessonRows(classObj)}
                </tbody>
            </table>
            <div class="class-actions">
                <button class="add-row-btn"
                        onclick="scheduleCreator.uiManager.addLessonRow('${classObj.id}')">
                    + Добавить урок
                </button>
                <button class="skip-lesson-btn"
                        onclick="scheduleCreator.uiManager.addSkipRow('${classObj.id}')">
                    + Пропуск урока
                </button>
            </div>
        `;
    }

    renderLessonRows(classObj) {
        return classObj.lessons.map((lesson, index) => {
            const isSkip = lesson.subject === '--|--';
            const subjectClass = isSkip ? 'subject-skip' : (lesson.subject ? 'subject-filled' : '');
            const subjectDisplay = this.formatSubjectDisplay(lesson);

            // Формируем отображение кабинетов
            const classroomsDisplay = this.formatClassroomsDisplay(lesson);
            const hasClassrooms = lesson.classrooms && lesson.classrooms.length > 0;
            const classroomsClass = hasClassrooms ? 'classroom-filled' : '';

            // Проверяем конфликт для этого урока
            const hasConflict = this.conflictManager.checkConflictForLesson(
                classObj.id, index, lesson, this.classManager.classes
            );
            const conflictClass = hasConflict ? 'has-conflict' : '';

            // Создаем подсказку с предметом для кнопки кабинета
            const buttonTitle = lesson.subject && lesson.subject !== '--|--'
                ? `Предмет: ${lesson.subject}`
                : 'Выберите кабинет';

            return `
                <tr class="${conflictClass}" data-lesson-index="${index}">
                    <td>${index + 1}</td>
                    <td>
                        <button class="subject-select ${subjectClass}"
                                onclick="scheduleCreator.uiManager.openSubjectModal('${classObj.id}', ${index})">
                            ${subjectDisplay}
                        </button>
                    </td>
                    <td>
                        <div class="classroom-cell">
                            <button class="classroom-select ${classroomsClass}"
                                    onclick="scheduleCreator.uiManager.openClassroomManagement('${classObj.id}', ${index})"
                                    ${!lesson.subject || isSkip ? 'disabled' : ''}
                                    title="${buttonTitle}">
                                ${classroomsDisplay || 'Выберите кабинет'}
                            </button>
                            ${hasClassrooms ? `<span class="classroom-count">${lesson.classrooms.length}</span>` : ''}
                            ${hasConflict ? '<span class="conflict-badge" title="Конфликт кабинета">⚠️</span>' : ''}
                        </div>
                    </td>
                    <td>
                        ${index > 0 ? `<button class="delete-lesson-btn" onclick="scheduleCreator.uiManager.deleteLesson('${classObj.id}', ${index})">×</button>` : ''}
                    </td>
                </tr>
            `;
        }).join('');
    }

    formatSubjectDisplay(lesson) {
        if (lesson.subject === '--|--') return 'ПРОПУСК';
        if (!lesson.subject) return 'Выберите предмет';
        return lesson.subject;
    }

    formatClassroomsDisplay(lesson) {
        if (!lesson.classrooms || lesson.classrooms.length === 0) {
            return '';
        }

        // Отображаем предмет в начале если есть
        const subjectPrefix = lesson.subject && lesson.subject !== '--|--' ? `${lesson.subject}: ` : '';

        const classrooms = lesson.classrooms.map(c => {
            if (typeof c === 'object' && c.type && c.classroom) {
                return `${c.classroom}(${c.type.toUpperCase()})`;
            } else if (typeof c === 'object' && c.classroom) {
                return c.classroom;
            }
            return c;
        }).join('/');

        return `${subjectPrefix}${classrooms}`;
    }

    updateCurrentClassroomsList(classId, lessonIndex) {
        const classObj = this.classManager.getClass(classId);
        if (!classObj) return;

        const lesson = classObj.lessons[lessonIndex];
        const container = document.getElementById('classroomsContainer');

        if (!container) return;

        container.innerHTML = '';

        if (!lesson.classrooms || lesson.classrooms.length === 0) {
            container.innerHTML = '<p class="no-classrooms">Кабинеты не выбраны</p>';
            return;
        }

        lesson.classrooms.forEach((classroomObj, index) => {
            const classroom = typeof classroomObj === 'object' ? classroomObj.classroom : classroomObj;
            const type = typeof classroomObj === 'object' ? (classroomObj.type || '') : '';
            const subject = lesson.subject && lesson.subject !== '--|--' ? lesson.subject : '';

            const classroomItem = document.createElement('div');
            classroomItem.className = 'classroom-item';

            // Определяем активный класс для кнопок
            const noTypeActive = type === '' ? 'active' : '';
            const profileActive = type === 'п' ? 'active' : '';
            const electiveActive = type === 'э' ? 'active' : '';
            const basicActive = type === 'б' ? 'active' : '';

            classroomItem.innerHTML = `
                <div class="classroom-info">
                    <div class="classroom-with-subject">
                        <span class="classroom-name">${classroom}</span>
                        ${subject ? `<span class="classroom-subject">${subject}</span>` : ''}
                    </div>
                    <span class="classroom-type ${type ? 'has-type' : ''}">
                        ${type ? `(${type.toUpperCase()})` : ''}
                    </span>
                </div>
                <div class="classroom-actions">
                    <button class="type-select-btn ${noTypeActive}"
                            onclick="scheduleCreator.uiManager.selectClassroomType('${classId}', ${lessonIndex}, ${index}, '')"
                            title="Без типа">
                        ∅
                    </button>
                    <button class="type-select-btn ${profileActive}"
                            onclick="scheduleCreator.uiManager.selectClassroomType('${classId}', ${lessonIndex}, ${index}, 'п')"
                            title="Профильный">
                        П
                    </button>
                    <button class="type-select-btn ${electiveActive}"
                            onclick="scheduleCreator.uiManager.selectClassroomType('${classId}', ${lessonIndex}, ${index}, 'э')"
                            title="Элективный">
                        Э
                    </button>
                    <button class="type-select-btn ${basicActive}"
                            onclick="scheduleCreator.uiManager.selectClassroomType('${classId}', ${lessonIndex}, ${index}, 'б')"
                            title="Базовый">
                        Б
                    </button>
                    <button class="delete-classroom-btn"
                            onclick="scheduleCreator.uiManager.removeClassroom('${classId}', ${lessonIndex}, ${index})">
                        ×
                    </button>
                </div>
            `;
            container.appendChild(classroomItem);
        });
    }

    selectClassroomType(classId, lessonIndex, classroomIndex, type) {
        if (this.classManager.updateClassroomType(classId, lessonIndex, classroomIndex, type)) {
            const classObj = this.classManager.getClass(classId);
            this.updateCurrentClassroomsList(classId, lessonIndex);
            this.updateClassTable(classObj);
            this.conflictManager.updateAllConflicts(this.classManager.classes);
            console.log('Обновлен тип кабинета:', classId, lessonIndex, classroomIndex, type);
        }
    }

    removeClassroom(classId, lessonIndex, classroomIndex) {
        const classObj = this.classManager.getClass(classId);
        if (classObj && classObj.lessons[lessonIndex]) {
            const lesson = classObj.lessons[lessonIndex];
            if (lesson.classrooms && lesson.classrooms.length > classroomIndex) {
                const classroomObj = lesson.classrooms[classroomIndex];
                const classroom = typeof classroomObj === 'object' ? classroomObj.classroom : classroomObj;

                this.classManager.removeClassroomFromLesson(classId, lessonIndex, classroom);
                this.updateCurrentClassroomsList(classId, lessonIndex);
                this.updateClassTable(classObj);
                this.conflictManager.updateAllConflicts(this.classManager.classes);
                console.log('Удален кабинет:', classId, lessonIndex, classroomIndex);
            }
        }
    }

    updateClassTable(classObj) {
        const tbody = document.getElementById(`lessons-${classObj.id}`);
        if (!tbody) return;

        tbody.innerHTML = this.renderLessonRows(classObj);
        this.updateDownloadButton();
    }

    updateClassName(classId, newName) {
        this.classManager.updateClassName(classId, newName);
        this.updateDownloadButton();
        this.conflictManager.updateAllConflicts(this.classManager.classes);
    }

    deleteClass(classId) {
        if (confirm('Удалить этот класс из расписания?')) {
            this.classManager.deleteClass(classId);
            const element = document.querySelector(`[data-class-id="${classId}"]`);
            if (element) element.remove();
            this.updateDownloadButton();
            this.conflictManager.updateAllConflicts(this.classManager.classes);
        }
    }

    addLessonRow(classId) {
        if (this.classManager.addLessonRow(classId)) {
            const classObj = this.classManager.getClass(classId);
            this.updateClassTable(classObj);
        }
    }

    addSkipRow(classId) {
        if (this.classManager.addSkipRow(classId)) {
            const classObj = this.classManager.getClass(classId);
            this.updateClassTable(classObj);
        }
    }

    deleteLesson(classId, lessonIndex) {
        const classObj = this.classManager.getClass(classId);
        if (classObj && classObj.lessons[lessonIndex] && confirm(`Удалить ${lessonIndex + 1} урок?`)) {
            if (this.classManager.deleteLesson(classId, lessonIndex)) {
                this.updateClassTable(classObj);
                this.conflictManager.updateAllConflicts(this.classManager.classes);
            }
        }
    }

    openSubjectModal(classId, lessonIndex) {
        console.log('Открытие модального окна предметов');
        this.selectedCell = { classId, lessonIndex, type: 'subject' };

        document.getElementById('subjectModal').classList.remove('hidden');

        setTimeout(() => {
            const searchInput = document.getElementById('subjectSearch');
            if (searchInput) {
                searchInput.focus();
                searchInput.value = '';
            }
        }, 100);
    }

    openClassroomManagement(classId, lessonIndex) {
        const classObj = this.classManager.getClass(classId);
        if (!classObj || !classObj.lessons[lessonIndex]?.subject ||
            classObj.lessons[lessonIndex].subject === '--|--') {
            alert('Сначала выберите предмет (кроме пропуска)!');
            return;
        }

        console.log('Открытие модального окна управления кабинетами');
        this.selectedCell = { classId, lessonIndex, type: 'classroomManagement' };

        this.updateCurrentClassroomsList(classId, lessonIndex);
        this.populateClassroomManagementList();

        document.getElementById('classroomManagementDialog').classList.remove('hidden');

        setTimeout(() => {
            const searchInput = document.getElementById('classroomManagementSearch');
            if (searchInput) {
                searchInput.focus();
                searchInput.value = '';
            }
        }, 100);
    }

    populateSubjectList() {
        const subjectsList = document.getElementById('subjectsList');
        if (!subjectsList) return;

        subjectsList.innerHTML = Constants.SUBJECTS.map(subject => {
            const isSkip = subject === '--|--';
            return `
                <button class="modal-item ${isSkip ? 'skip-item' : ''}"
                        onclick="scheduleCreator.uiManager.selectItem('${Constants.escapeHtml(subject)}', 'subject')">
                    ${isSkip ? '🎯 ПРОПУСК УРОКА' : subject}
                </button>
            `;
        }).join('');
    }

    populateClassroomList() {
        const classroomsList = document.getElementById('classroomsList');
        if (!classroomsList) return;

        classroomsList.innerHTML = Constants.CLASSROOMS.map(classroom => `
            <button class="modal-item" onclick="scheduleCreator.uiManager.selectClassroom('${Constants.escapeHtml(classroom)}')">
                ${classroom}
            </button>
        `).join('');
    }

    populateClassroomManagementList() {
        const classroomsList = document.getElementById('classroomManagementList');
        if (!classroomsList) return;

        const classObj = this.classManager.getClass(this.selectedCell?.classId);
        const lesson = classObj?.lessons[this.selectedCell?.lessonIndex];
        const currentClassrooms = lesson?.classrooms?.map(c =>
            typeof c === 'object' ? c.classroom : c
        ) || [];

        classroomsList.innerHTML = Constants.CLASSROOMS.map(classroom => {
            const isSelected = currentClassrooms.includes(classroom);
            const buttonClass = isSelected ? 'modal-item selected' : 'modal-item';

            return `
                <button class="${buttonClass}"
                        onclick="scheduleCreator.uiManager.addClassroomToLesson('${Constants.escapeHtml(classroom)}')">
                    ${classroom}
                    ${isSelected ? '<span class="selected-indicator">✓</span>' : ''}
                </button>
            `;
        }).join('');
    }

    filterClassroomsForManagement(searchTerm) {
        const filtered = Constants.CLASSROOMS.filter(classroom =>
            classroom.toLowerCase().includes(searchTerm.toLowerCase())
        );

        const classroomsList = document.getElementById('classroomManagementList');
        if (!classroomsList) return;

        const classObj = this.classManager.getClass(this.selectedCell?.classId);
        const lesson = classObj?.lessons[this.selectedCell?.lessonIndex];
        const currentClassrooms = lesson?.classrooms?.map(c =>
            typeof c === 'object' ? c.classroom : c
        ) || [];

        classroomsList.innerHTML = filtered.map(classroom => {
            const isSelected = currentClassrooms.includes(classroom);
            const buttonClass = isSelected ? 'modal-item selected' : 'modal-item';

            return `
                <button class="${buttonClass}"
                        onclick="scheduleCreator.uiManager.addClassroomToLesson('${Constants.escapeHtml(classroom)}')">
                    ${classroom}
                    ${isSelected ? '<span class="selected-indicator">✓</span>' : ''}
                </button>
            `;
        }).join('');
    }

    addClassroomToLesson(classroom) {
        if (!this.selectedCell) return;

        const { classId, lessonIndex } = this.selectedCell;
        const classObj = this.classManager.getClass(classId);

        if (classObj && classObj.lessons[lessonIndex]) {
            const lesson = classObj.lessons[lessonIndex];

            // Проверяем, есть ли уже этот кабинет
            const existingIndex = lesson.classrooms?.findIndex(c =>
                typeof c === 'object' ? c.classroom === classroom : c === classroom
            );

            if (existingIndex !== -1 && existingIndex !== undefined) {
                // Кабинет уже есть - удаляем его
                this.removeClassroomFromList(classId, lessonIndex, classroom);
            } else {
                // Добавляем новый кабинет
                if (this.classManager.addClassroomToLesson(classId, lessonIndex, classroom)) {
                    // Проверяем конфликты
                    this.conflictManager.checkAndHandleConflicts(
                        classId, lessonIndex, classroom,
                        this.classManager.classes, this
                    );
                }
            }

            // Обновляем списки и таблицу
            this.updateCurrentClassroomsList(classId, lessonIndex);
            this.populateClassroomManagementList();
            this.updateClassTable(classObj);
        }
    }

    removeClassroomFromList(classId, lessonIndex, classroom) {
        if (this.classManager.removeClassroomFromLesson(classId, lessonIndex, classroom)) {
            const classObj = this.classManager.getClass(classId);
            this.updateCurrentClassroomsList(classId, lessonIndex);
            this.updateClassTable(classObj);
            this.conflictManager.updateAllConflicts(this.classManager.classes);
        }
    }

    selectItem(value, type) {
        if (!this.selectedCell) return;

        const { classId, lessonIndex } = this.selectedCell;

        if (type === 'subject') {
            if (this.classManager.updateLessonSubject(classId, lessonIndex, value)) {
                const classObj = this.classManager.getClass(classId);
                this.updateClassTable(classObj);
                this.closeModals();

                // Если есть кабинеты, обновляем их отображение с новым предметом
                const lesson = classObj.lessons[lessonIndex];
                if (lesson.classrooms && lesson.classrooms.length > 0) {
                    this.updateCurrentClassroomsList(classId, lessonIndex);
                }
            }
        }
    }

    showCombinedLessonDialog(classroom, lessonIndex, conflict) {
        const conflictClass = this.classManager.getClass(conflict.classId);
        if (conflictClass) {
            const conflictLesson = conflictClass.lessons[lessonIndex];

            document.getElementById('conflictClassroom').textContent = classroom;
            document.getElementById('conflictLesson').textContent = lessonIndex + 1;
            document.getElementById('conflictClass').textContent = conflictClass.name;
            document.getElementById('conflictSubject').textContent = conflictLesson?.subject || '';

            document.getElementById('combinedLessonDialog').classList.remove('hidden');
            this.highlightConflict(conflict.classId, lessonIndex);
        }
    }

    highlightConflict(classId, lessonIndex) {
        const tbody = document.getElementById(`lessons-${classId}`);
        if (tbody) {
            const rows = tbody.querySelectorAll('tr');
            if (rows[lessonIndex]) {
                rows[lessonIndex].classList.add('highlight-conflict');
                setTimeout(() => rows[lessonIndex].classList.remove('highlight-conflict'), 3000);
            }
        }
    }

    async handleCombinedLesson(isCombined) {
        this.closeCombinedDialog();

        if (this.conflictManager.pendingSelection) {
            const { classId, lessonIndex, classroom } = this.conflictManager.pendingSelection;
            const classObj = this.classManager.getClass(classId);

            if (classObj && classObj.lessons[lessonIndex]) {
                if (!isCombined) {
                    this.removeClassroomFromList(classId, lessonIndex, classroom);
                    alert(`Кабинет ${classroom} уже занят. Выберите другой кабинет.`);
                }
            }

            this.conflictManager.pendingSelection = null;
        }
    }

    closeCombinedDialog() {
        document.getElementById('combinedLessonDialog').classList.add('hidden');
    }

    closeClassroomManagementDialog() {
        document.getElementById('classroomManagementDialog').classList.add('hidden');
        this.selectedCell = null;

        // Обновляем таблицу после закрытия
        if (this.selectedCell) {
            const { classId } = this.selectedCell;
            const classObj = this.classManager.getClass(classId);
            if (classObj) {
                this.updateClassTable(classObj);
            }
        }
    }

    filterItems(searchTerm, type) {
        const items = type === 'subjects' ? Constants.SUBJECTS : Constants.CLASSROOMS;
        const filtered = items.filter(item =>
            item.toLowerCase().includes(searchTerm.toLowerCase())
        );

        const listId = type === 'subjects' ? 'subjectsList' : 'classroomsList';
        const list = document.getElementById(listId);

        if (!list) return;

        list.innerHTML = filtered.map(item => {
            const isSkip = item === '--|--';
            return `
                <button class="modal-item ${isSkip ? 'skip-item' : ''}"
                        onclick="scheduleCreator.uiManager.selectItem('${Constants.escapeHtml(item)}', 'subject')">
                    ${isSkip ? '🎯 ПРОПУСК УРОКА' : item}
                </button>
            `;
        }).join('');
    }

    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
        });
        this.selectedCell = null;

        // Сбрасываем поиск
        const subjectSearch = document.getElementById('subjectSearch');
        const classroomSearch = document.getElementById('classroomSearch');
        if (subjectSearch) subjectSearch.value = '';
        if (classroomSearch) classroomSearch.value = '';

        // Восстанавливаем полные списки
        this.populateSubjectList();
        this.populateClassroomList();
    }

    updateDownloadButton() {
        const downloadBtn = document.getElementById('downloadExcelBtn');
        if (!downloadBtn) return;

        downloadBtn.disabled = !this.classManager.hasValidData();
    }

    downloadSchedule() {
        if (!this.currentDay) {
            alert('Сначала выберите день недели!');
            return;
        }

        if (!this.classManager.hasValidData()) {
            alert('Добавьте хотя бы один класс с названием и уроками (кроме пропусков)!');
            return;
        }

        const schedule = {
            day: this.currentDay,
            classes: this.classManager.classes.filter(c => c.name.trim() &&
                c.lessons.some(l => l.subject && l.subject !== '--|--')),
            createdAt: new Date().toISOString()
        };

        console.log('Скачивание расписания:', schedule);
        // Экспорт будет вызван через scheduleCreator
        scheduleCreator.exportManager.exportToExcel(schedule);
    }

    clearAll() {
        if (confirm('Очистить всё расписание? Это действие нельзя отменить.')) {
            this.classManager.classes = [];
            this.conflictManager.clearConflicts();
            this.conflictManager.pendingSelection = null;

            const container = document.getElementById('classesContainer');
            if (container) container.innerHTML = '';

            const scheduleArea = document.getElementById('scheduleArea');
            if (scheduleArea) scheduleArea.classList.add('hidden');

            this.currentDay = null;
            document.querySelectorAll('.day-btn').forEach(btn => {
                btn.classList.remove('active');
            });

            this.updateDownloadButton();
            console.log('Все данные очищены');
        }
    }

    // Метод для выбора кабинета из старого модального окна (для обратной совместимости)
    selectClassroom(classroom) {
        this.addClassroomToLesson(classroom);
    }
}