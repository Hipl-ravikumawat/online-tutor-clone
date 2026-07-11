let timezoneCheckTimeout = null;
// window.currentWarningData = null;  // CHANGE THIS LINE
let currentWarningData = null;
let studentSelectionChanged = false;
let studentsWerePreSelected = false;
let timezoneAjaxRequest = null;

function initTimezoneWarning() {
  
  const preSelected = $('#student_ids').val() || [];
  if (preSelected.length > 0) {
    studentsWerePreSelected = true;
  }

  $('#tutor_id').on('change', function() {
    debounceTimezoneCheck();
  });

  // $('#student_ids').on('change', function() {
  //   debounceTimezoneCheck();
  // });
  
  // $('#student_ids').on('change', function() {
  //   studentSelectionChanged = true;
  // });

$('#student_ids').on('change change:select2', function () {
    studentSelectionChanged = true;
});
  
  $('#add_substitute_tutor').on('change', function() {
    if ($(this).is(':checked')) {
      $('.add_substitute_block').slideDown();
      debounceTimezoneCheck();
    } else {
      $('.add_substitute_block').slideUp();
      $('#substitute_tutor_id').val(null);
      debounceTimezoneCheck();
    }
  });
  
  $('#substitute_tutor_id').on('change', function() {
    debounceTimezoneCheck();
  });
  
  // Hide substitute block initially
  $('.add_substitute_block').hide();
}

function debounce(fn, delay = 500) {
  let timeout;

  return function (...args) {
    clearTimeout(timeout);

    timeout = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

const debounceTimezoneCheck = debounce(performTimezoneCheck, 500);

// function debounceTimezoneCheck() {
//   clearTimeout(timezoneCheckTimeout);
//   timezoneCheckTimeout = setTimeout(() => {
//     performTimezoneCheck();
//   }, 500);
// }

function performTimezoneCheck() {
  const tutorId = $('#tutor_id').val();
  const studentIds = $('#student_ids').val() || [];
  const isSubstituteActive = $('#add_substitute_tutor').is(':checked');
  const substituteTutorId = isSubstituteActive ? $('#substitute_tutor_id').val() : null;
  
  // Remove existing warning modal
  removeTimezoneWarningModal();
  
  // Validate selections
  if (!tutorId || studentIds.length === 0) {
    return;
  }

  if (timezoneAjaxRequest) {
    timezoneAjaxRequest.abort();
  }
  
  // Make AJAX call
  timezoneAjaxRequest = $.ajax({
    type: "POST",
    url: "/calendar/check-timezone-difference",
    data: {
      tutor_id: tutorId,
      student_ids: studentIds,
      substitute_tutor_id: substituteTutorId || ''
    },
    dataType: "json",
    success: function(response) {
      if (response.success && response.hasDifference) {
        // window.currentWarningData = response;  // CHANGE THIS LINE
        currentWarningData = response;  // CHANGE THIS LINE
        showTimezoneWarningModal(response);
      } else {
        // If no difference, remove any existing flag
        removeTimezoneFlag();
        // window.currentWarningData = null;  // ADD THIS LINE
        currentWarningData = null;  // ADD THIS LINE
        removeTimezoneWarningModal();
      }
    },
    error: function(error) {
      console.error("Timezone check failed:", error);
    },
    complete: function () {
      timezoneAjaxRequest = null;
    }
  });
}

function showTimezoneWarningModal(data) {
  // Create student list HTML
  const studentListHtml = data.students.map(s => 
    `<li><strong>${s.name}</strong> (${escapeHtml(s.timezone)})</li>`
  ).join('');
  
  // Create modal HTML
  const modalHtml = `
    <div class="modal fade common-modal" id="timezoneWarningModal" tabindex="-1" role="dialog" data-backdrop="static" data-keyboard="false">
      <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">
              <i class="fa fa-exclamation-triangle" style="color: #ffc107;"></i> 
              Time Zone Warning
            </h3>
            <button type="button" class="close p-0 m-0 opacity-100" data-dismiss="modal" aria-label="Close">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18" stroke="#4A4674" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                <path d="M6 6L18 18" stroke="#4A4674" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
              </svg>
            </button>
          </div>
          <div class="modal-body stud_message_details time_zone_warning">
            <div class="main_stud_info">
              <h6>This tutor is in a different time zone!</h6>
              <div class="stud_info"><strong>${escapeHtml(data.tutor.name)}</strong> (${escapeHtml(data.tutor.timezone)})</div>
            </div>
            <div class="main_stud_info">
              <h6>This student(s) is in different time zone:</h6>
              <ul class="stud_info">${studentListHtml}</ul>
            </div>
            <p class="mt-3 mb-0">Do you still want to proceed?</p>
            <p class="small mb-0">(Session times will be shown in each user's local time zone.)</p>
          </div>
          <div class="modal-footer">
            <div class="btn-rightarea">
              <button type="button" class="bus-outline-btn" data-dismiss="modal" id="cancelTimezoneWarning">Cancel</button>
              <button type="button" class="btn theme-btn" id="confirmTimezoneWarning">Yes, Proceed Anyway</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Remove existing modal if any
  removeTimezoneWarningModal();
  
  // Add modal to body
  $('body').append(modalHtml);
  
  // Show modal
  $('#timezoneWarningModal').modal('show');
  
  // Handle confirm button
  $('#confirmTimezoneWarning').off('click').on('click', function() {
    addTimezoneFlagToForm();
    $('#timezoneWarningModal').modal('hide');
  });
  
  // Handle cancel button
  $('#cancelTimezoneWarning').off('click').on('click', function() {
    removeTimezoneFlag();
  });
  
  // Handle modal close
  $(document).off('hidden.bs.modal', '#timezoneWarningModal')
    .on('hidden.bs.modal', '#timezoneWarningModal', function () {
      $(this).remove();
    });
}

function addTimezoneFlagToForm() {
  const form = $('#create-new-event:visible, #update-an-event:visible').first();

  let field = $('#timezone_acknowledged_flag');

  if (!field.length) {
    form.append(`
      <input 
        type="hidden" 
        id="timezone_acknowledged_flag" 
        name="timezone_warning_acknowledged" 
        value="1">
    `);
  }
}

function removeTimezoneFlag() {
    $('#timezone_acknowledged_flag').remove();
    $('#timezone_acknowledged_flag_false').remove();  // ADD THIS LINE
}

function removeTimezoneWarningModal() {
  $('#timezoneWarningModal').remove();
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize on page load
$(document).ready(function() {
  initTimezoneWarning();

  
  // Modal Open an Edit Condition
  if (studentsWerePreSelected) {
    const tutorId = $('#tutor_id').val();
    if (tutorId) {
      performTimezoneCheck(true);
    }
  }
});

// TimeZone Warning Modal
$(document).on('mousedown', function (e) {
  const container = $('.attendess_select2_withModal');
  if (!container.is(e.target) && container.has(e.target).length === 0) {
    if (studentSelectionChanged) {
      studentSelectionChanged = false;
      debounceTimezoneCheck();
    }
  }
});


// Modal Open an Add Condition
$('#student_ids').on('blur', function () {
  if (studentSelectionChanged) {
    studentSelectionChanged = false;
    debounceTimezoneCheck();
  }
});