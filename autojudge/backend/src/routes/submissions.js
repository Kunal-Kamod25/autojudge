const router = require('express').Router();
const ctrl = require('../controllers/submissionController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(protect);
router.post('/', upload.single('file'), ctrl.submit);
router.get('/me', ctrl.getMySubmissions);
router.get('/:id', ctrl.getSubmission);
router.get('/:id/pdf', ctrl.downloadPDF);

module.exports = router;
