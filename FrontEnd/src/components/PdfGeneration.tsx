
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { Test } from '@/types/Test';
import { Question , Answer } from '@/types/QuestionAnswer';

// Create styles for PDF
const styles = StyleSheet.create({
  page: {
    padding: 30,
    backgroundColor: '#ffffff'
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center'
  },
  description: {
    fontSize: 12,
    marginBottom: 20
  },
  questionSection: {
    marginBottom: 20
  },
  question: {
    fontSize: 14,
    marginBottom: 10,
    fontWeight: 'bold'
  },
  questionImage: {
    width: 200,
    height: 200,
    marginVertical: 10,
    alignSelf: 'center'
  },
  answer: {
    fontSize: 12,
    marginLeft: 20,
    marginBottom: 5
  }
});

// PDF Document Component
const TestDocument: React.FC<{ test: Test; questions: Question[] }> = ({ test, questions }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.title}>{test.title}</Text>
      <Text style={styles.description}>{test.description}</Text>
      
      {questions.map((question, index) => (
        <View key={question.id} style={styles.questionSection}>
          <Text style={styles.question}>
            {index + 1}. {question.content}
          </Text>
          
          {question.photo_path && (
            <Image
              style={styles.questionImage}
              src={`http://localhost:5000${question.photo_path}`}
            />
          )}
          
          {question.answers.map((answer : Answer, idx : number) => (
            <Text key={idx} style={styles.answer}>
              {String.fromCharCode(65 + idx)}. {answer.content}
            </Text>
          ))}
        </View>
      ))}
    </Page>
  </Document>
);

// PDF Generation Function


export default TestDocument;