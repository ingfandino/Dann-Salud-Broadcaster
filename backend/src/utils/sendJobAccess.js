function idToString(value) {
    if (!value) return null;
    if (value._id) return String(value._id);
    return String(value);
}

function isJobOwner(user, job) {
    const userId = idToString(user);
    const ownerId = idToString(job?.createdBy);
    return !!userId && !!ownerId && userId === ownerId;
}

function canAccessSendJob(user, job) {
    const role = String(user?.role || "").toLowerCase();
    if (["admin", "gerencia", "encargado"].includes(role)) return true;
    if (role === "supervisor") {
        const jobOwnerTeam = job?.createdBy?.numeroEquipo;
        if (jobOwnerTeam && user?.numeroEquipo) {
            return String(jobOwnerTeam) === String(user.numeroEquipo);
        }
        return isJobOwner(user, job);
    }
    return isJobOwner(user, job);
}

function canControlSendJob(user, job) {
    return canAccessSendJob(user, job);
}

module.exports = {
    canAccessSendJob,
    canControlSendJob,
    isJobOwner,
};
