import { Calendar, Phone } from "lucide-react";

interface Appointment {
  contactName: string;
  contactNumber: string;
  appointmentTime: string;
  actionType: string;
  notes: string;
}

interface UpcomingAppointmentsProps {
  appointments: Appointment[];
}

export function UpcomingAppointments({ appointments }: UpcomingAppointmentsProps) {
  if (appointments.length === 0) {
    return null;
  }

  const formatDateTime = (dateTimeStr: string) => {
    if (!dateTimeStr) return "";
    const date = new Date(dateTimeStr);
    return date.toLocaleString('ar-EG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const sortedAppointments = [...appointments].sort((a, b) => {
    return new Date(a.appointmentTime).getTime() - new Date(b.appointmentTime).getTime();
  });

  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
      <div className="p-6 border-b border-zinc-200 bg-purple-50">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-purple-600" />
          <h3 className="text-xl font-bold text-zinc-900">المواعيد القادمة</h3>
        </div>
      </div>
      <div className="divide-y divide-zinc-200">
        {sortedAppointments.map((appointment, index) => (
          <div key={index} className="p-5 hover:bg-zinc-50 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Phone className="w-5 h-5 text-zinc-600" />
                  <div>
                    <p className="font-semibold text-zinc-900">{appointment.contactName}</p>
                    <p className="text-sm text-zinc-600 font-mono">{appointment.contactNumber}</p>
                  </div>
                </div>
                {appointment.notes && (
                  <p className="text-sm text-zinc-600 mr-8">{appointment.notes}</p>
                )}
              </div>
              <div className="text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-lg mb-2">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {appointment.actionType === "viewing" ? "معاينة" : appointment.actionType === "booking" ? "حجز" : "اتصال"}
                  </span>
                </div>
                <p className="text-sm font-semibold text-zinc-900">{formatDateTime(appointment.appointmentTime)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
