
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { Test } from '@/types/Test';
import { Question  } from '@/types/QuestionAnswer';

// Create styles for PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica'
  },
  header: {
    marginBottom: 30
  },
  title: {
    fontSize: 24,
    marginBottom: 15,
    textAlign: 'center',
    color: '#2563eb', // blue-600
    textTransform: 'uppercase',
    fontWeight: 'bold'
  },
  description: {
    fontSize: 12,
    marginBottom: 20,
    textAlign: 'center',
    color: '#4b5563' // gray-600
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingHorizontal: 20
  },
  infoBox: {
    border: '1px solid #e5e7eb', // gray-200
    padding: 10,
    borderRadius: 4,
    width: '45%'
  },
  infoLabel: {
    fontSize: 10,
    color: '#6b7280', // gray-500
    marginBottom: 5
  },
  infoValue: {
    fontSize: 12,
    color: '#1f2937', // gray-800
    fontWeight: 'bold'
  },
  questionSection: {
    marginBottom: 30,
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: 20
  },
  question: {
    fontSize: 14,
    marginBottom: 15,
    color: '#1f2937', // gray-800
    backgroundColor: '#f3f4f6', // gray-100
    padding: 8,
    borderRadius: 4
  },
  questionImage: {
    marginVertical: 15,
    alignSelf: 'center',
    objectFit: 'contain',
    maxHeight: 500 // prevent extremely tall images from breaking layout
  },
  answersContainer: {
    marginLeft: 20,
  },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  checkbox: {
    width: 12,
    height: 12,
    border: '1px solid #9ca3af', // gray-400
    borderRadius: 2,
    marginRight: 8
  },
  answer: {
    fontSize: 12,
    color: '#374151' // gray-700
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 10,
    color: '#6b7280' // gray-500
  }
});

// Convert minutes to hours and minutes display
const formatTimeLimit = (minutes : number) => {
  const hours = Math.floor(minutes / 60 );
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h${mins > 0 ? ` ${mins}min` : ''}`;
  }
  return `${mins} minutes`;
};

// PDF Document Component
const TestDocument: React.FC<{ test: Test; questions: Question[] }> = ({ test, questions }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>{test.title}</Text>
        <Text style={styles.description}>{test.description}</Text>
        
        <View style={styles.infoRow}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Duration</Text>
            <Text style={styles.infoValue}>{
                // @ts-expect-error - test.time_limit is a number
            formatTimeLimit(test.time_limit)
            }</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Passing Score</Text>
            <Text style={styles.infoValue}>{test.passing_score}%</Text>
          </View>
        </View>
      </View>

      {questions.map((question, index) => (
        <View key={question.id} style={styles.questionSection}>
          <Text style={styles.question}>
            Question {index + 1}: {question.content}
          </Text>
          
          {question.photo_path && (
            <Image
              style={styles.questionImage}
              src={`http://localhost:5000${question.photo_path}`}
            />
          )}
          
          <View style={styles.answersContainer}>
            {question.answers.map((answer, idx) => (
              <View key={idx} style={styles.answerRow}>
                <View style={styles.checkbox} />
                <Text style={styles.answer}>{answer.content}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}

      <Text style={styles.footer}>
        Page 1 of 1 • {test.title}
      </Text>
    </Page>
  </Document>
);

// PDF Generation Function


export default TestDocument;