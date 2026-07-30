import { OrientationCheck } from '@/components/orientation-check'
import Link from 'next/link'

export default function InstructionsPage() {
  return (
    <OrientationCheck>
      <main className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="bg-[#B7B8AC] rounded-lg p-8 max-w-2xl w-full">
          <h1 className="text-2xl font-bold mb-6 text-center">
            คำชี้แจงให้ท่านผู้ปกครอง
          </h1>
          <ol className="space-y-4 text-lg">
            <li className="flex gap-2">
              <span className="font-bold">1.</span>
              <span>ขอให้ท่านช่วยฟังการออกเสียงของน้องให้ถูกต้อง</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">2.</span>
              <span>หากน้องทำผิดข้อไหน ให้กดที่คำนั้น ก่อนกดถัดไป</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">3.</span>
              <span>
                ขอให้น้องทำขั้นต่ำวันละ 20 ข้อ แต่ถ้าสะดวกสามารถทำไปได้เรื่อยๆ เพราะคำถามไม่มีวันหมด
              </span>
            </li>
          </ol>
          <div className="mt-8 flex justify-center">
            <Link
              href="/quiz"
              className="bg-[#45a3e5] text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-[#3a8ac4] transition-colors"
            >
              เข้าใจแล้ว
            </Link>
          </div>
        </div>
      </main>
    </OrientationCheck>
  )
}

