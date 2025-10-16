// frontend/src/services/NotificationService.js

import { toast } from "react-toastify";

const NotificationService = {
    success: (msg) =>
        toast.success(msg, {
            position: "top-right",
            autoClose: 3000,
        }),
    error: (msg) =>
        toast.error(msg, {
            position: "top-right",
            autoClose: 4000,
        }),
    info: (msg) =>
        toast.info(msg, {
            position: "top-right",
            autoClose: 3000,
        }),
};

export default NotificationService;