const PDFDocument = require('pdfkit');
const jobService = require('./jobService');

class PDFService {
  async generateJobPDF(jobId) {
    // 채용공고 데이터 가져오기
    const job = await jobService.getJobById(jobId);
    
    // PDF 문서 생성
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `${job.company_name} - ${job.title}`,
        Author: '채용공고 포털',
        Subject: '채용공고',
        Keywords: `${job.company_name}, ${job.title}, 채용`
      }
    });
    
    // PDF 내용을 버퍼에 저장
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    
    return new Promise((resolve, reject) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer);
      });
      
      doc.on('error', reject);
      
      // PDF 내용 생성
      this.generatePDFContent(doc, job);
      
      // PDF 종료
      doc.end();
    });
  }
  
  generatePDFContent(doc, job) {
    const formatDate = (dateString) => {
      if (!dateString) return '정보 없음';
      const date = new Date(dateString);
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };
    
    // 헤더 - 회사명
    doc.fontSize(24)
       .fillColor('#2c3e50')
       .text(job.company_name, {
         align: 'center'
       });
    
    doc.moveDown(0.5);
    
    // 직무명
    doc.fontSize(20)
       .fillColor('#1a1a1a')
       .text(job.title, {
         align: 'center'
       });
    
    doc.moveDown(1.5);
    
    // 마감일 정보
    if (job.deadline) {
      doc.fontSize(12)
         .fillColor('#856404')
         .fillOpacity(0.1)
         .rect(50, doc.y, doc.page.width - 100, 40)
         .fill()
         .fillOpacity(1)
         .fillColor('#856404')
         .text(`마감일: ${formatDate(job.deadline)} ${job.is_always_recruiting ? '(상시채용)' : ''}`, 
               50, doc.y - 30, {
                 align: 'center',
                 width: doc.page.width - 100
               });
      
      doc.moveDown(2);
    }
    
    // 기본 정보 섹션
    doc.fontSize(14)
       .fillColor('#2c3e50')
       .text('기본 정보', 50);
    
    doc.moveDown(0.5);
    
    const infoItems = [
      { label: '경력', value: job.experience_level || '정보 없음' },
      { label: '고용형태', value: job.job_type || '정보 없음' },
      { label: '위치', value: job.location || '정보 없음' },
      { label: '학력', value: job.education_level || '정보 없음' }
    ];
    
    doc.fontSize(11)
       .fillColor('#333');
    
    infoItems.forEach(item => {
      doc.fillColor('#666')
         .text(item.label + ': ', { continued: true })
         .fillColor('#333')
         .text(item.value);
      doc.moveDown(0.3);
    });
    
    doc.moveDown(1);
    
    // 상세 설명
    if (job.description) {
      this.addSection(doc, '상세 설명', job.description);
    }
    
    // 자격 요건
    if (job.requirements) {
      this.addSection(doc, '자격 요건', job.requirements);
    }
    
    // 우대 사항
    if (job.preferred) {
      this.addSection(doc, '우대 사항', job.preferred);
    }
    
    // 복리후생
    if (job.benefits) {
      this.addSection(doc, '복리후생', job.benefits);
    }
    
    // 푸터
    doc.fontSize(10)
       .fillColor('#888')
       .text(`생성일: ${new Date().toLocaleDateString('ko-KR')}`, 50, doc.page.height - 80);
    
    doc.fontSize(9)
       .text(`원본 링크: ${job.url}`, 50, doc.page.height - 60, {
         link: job.url,
         underline: true
       });
  }
  
  addSection(doc, title, content) {
    // 페이지 넘김 체크
    if (doc.y > doc.page.height - 150) {
      doc.addPage();
    }
    
    // 섹션 제목
    doc.fontSize(14)
       .fillColor('#2c3e50')
       .text(title);
    
    doc.moveDown(0.5);
    
    // 섹션 내용
    doc.fontSize(10)
       .fillColor('#555')
       .text(content, {
         align: 'justify',
         lineGap: 4
       });
    
    doc.moveDown(1.5);
  }
}

module.exports = new PDFService();