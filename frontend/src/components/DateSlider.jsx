import { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

function DateSlider({ selectedDate, onDateChange }) {
  const [sliderValue, setSliderValue] = useState(100);
  
  // Date range: 2017-01-01 to today
  const minDate = new Date('2017-01-01');
  const maxDate = new Date();
  
  // Calculate total days
  const totalDays = Math.floor((maxDate - minDate) / (1000 * 60 * 60 * 24));
  
  // Convert slider value to date
  const sliderToDate = (value) => {
    const days = Math.floor((value / 100) * totalDays);
    const date = new Date(minDate);
    date.setDate(date.getDate() + days);
    return date;
  };
  
  // Convert date to slider value
  const dateToSlider = (date) => {
    const days = Math.floor((date - minDate) / (1000 * 60 * 60 * 24));
    return (days / totalDays) * 100;
  };
  
  // Update slider when date changes from picker
  useEffect(() => {
    setSliderValue(dateToSlider(selectedDate));
  }, [selectedDate]);
  
  // Handle slider change
  const handleSliderChange = (e) => {
    const value = parseFloat(e.target.value);
    setSliderValue(value);
    onDateChange(sliderToDate(value));
  };
  
  // Quick date buttons
  const quickDates = [
    { label: 'Today', date: new Date() },
    { label: '1 Week', date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    { label: '1 Month', date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    { label: '3 Months', date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
  ];
  
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>Date Selection</span>
      </h3>

      {/* Date picker */}
      <div className="space-y-2">
        <label className="text-xs text-gray-400">Select Date</label>
        <DatePicker
          selected={selectedDate}
          onChange={onDateChange}
          minDate={minDate}
          maxDate={maxDate}
          dateFormat="yyyy-MM-dd"
          className="w-full"
          calendarClassName="dark-calendar"
          showMonthDropdown
          showYearDropdown
          dropdownMode="select"
        />
      </div>

      {/* Date slider */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-gray-500">
          <span>2017</span>
          <span>{new Date().getFullYear()}</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="0.1"
          value={sliderValue}
          onChange={handleSliderChange}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer
                     accent-primary
                     [&::-webkit-slider-thumb]:appearance-none
                     [&::-webkit-slider-thumb]:w-4
                     [&::-webkit-slider-thumb]:h-4
                     [&::-webkit-slider-thumb]:bg-primary
                     [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:cursor-pointer
                     [&::-webkit-slider-thumb]:shadow-lg
                     [&::-webkit-slider-thumb]:transition-transform
                     [&::-webkit-slider-thumb]:hover:scale-110"
        />
      </div>

      {/* Quick date buttons */}
      <div className="space-y-2">
        <label className="text-xs text-gray-400">Quick Select</label>
        <div className="grid grid-cols-2 gap-2">
          {quickDates.map(({ label, date }) => (
            <button
              key={label}
              onClick={() => onDateChange(date)}
              className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 
                       text-gray-300 rounded-md transition-colors
                       border border-gray-700 hover:border-gray-600"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Date info */}
      <div className="p-3 bg-gray-800/50 rounded-lg">
        <div className="text-center">
          <div className="text-xs text-gray-400">Selected Date</div>
          <div className="text-lg font-semibold text-white mt-1">
            {selectedDate.toLocaleDateString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </div>
        </div>
      </div>

      {/* Info note */}
      <div className="text-xs text-gray-500 flex items-start gap-2">
        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p>
          Sentinel satellites revisit every 6-12 days. If no imagery is available for the selected date, the nearest available date will be used.
        </p>
      </div>
    </div>
  );
}

export default DateSlider;
