Задание:
   - Оценить код и предложить, что можно улучшить.
   - Провести рефакторинг кода и объяснить, почему предложенные изменения сделают код лучше (удобнее для сопровождения, улучшат производительность и т.д.).


function processTasks(tasks) {
    let completedTasks = [];
    let pendingTasks = [];
    let overdueTasks = [];
    
    for (let i = 0; i < tasks.length; i++) {
        let task = tasks[i];
        if (task.status === 'completed') {
            if (!task.dateCompleted) {
                task.dateCompleted = new Date();
            }
            completedTasks.push(task);
            console.log('Task ' + task.name + ' is completed');
        } else if (task.status === 'pending') {
            if (task.dueDate && new Date(task.dueDate) < new Date()) {
                overdueTasks.push(task);
                console.log('Task ' + task.name + ' is overdue');
            } else {
                pendingTasks.push(task);
                console.log('Task ' + task.name + ' is pending');
            }
        } else if (task.status === 'canceled') {
            console.log('Task ' + task.name + ' is canceled');
        } else {
            console.log('Unknown status for task ' + task.name);
        }
    }

    return {
        completed: completedTasks,
        pending: pendingTasks,
        overdue: overdueTasks,
    };
}


5 МИНУТ